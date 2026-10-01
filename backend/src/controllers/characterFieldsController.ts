import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { toInputJsonValue, toNullableInputJsonValue } from '../lib/inputJsonValue.js';
import { CoreDomainEvents, dispatchDomainEvent } from '../lib/domainEvents/index.js';
import { listEnabledCampaignCharacterPageDefinitions } from '../lib/campaignPlugins.js';
import { canReadCharacterPageTab, loadCharacterPageAccess } from './characterPagesController.js';
import { characterResourceProvenance, isUserDeletableCharacterResource } from '../lib/characterResourceProvenance.js';
import type {
  CharacterFieldDescriptor,
  CharacterFieldType,
  CharacterFieldValidation,
  PluginCharacterFieldDefinition,
} from '../../../shared/characterPages.js';
import { ENTITY_SHELL_CORE_PAGES } from '../../../shared/characterPages.js';
import type { CampaignMemberRole } from '../types/domain.js';

const fieldsDb = prisma as typeof prisma & { characterField: any; characterPageTab: any };
const FIELD_TYPES = new Set<CharacterFieldType>(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'JSON']);
const VALIDATION_KEYS = new Set(['required', 'min', 'max', 'maxLength', 'options']);
const MAX_FIELD_LENGTH = 10_000;
const MAX_ENUM_OPTIONS = 100;
const MAX_ENUM_OPTION_LENGTH = 200;

async function resolveFieldPageTab(
  campaignId: string,
  entityPageId: string,
  shell: string,
  canViewDmOnly: boolean,
  access: { canEdit: boolean; canViewDmOnly: boolean; shell: string },
  role: CampaignMemberRole | null,
  requested: unknown,
): Promise<string | null | undefined> {
  if (requested == null) return null;
  if (typeof requested !== 'string') return undefined;
  const stored = await fieldsDb.characterPageTab.findFirst({
    where: { id: requested, campaignId, characterPageId: entityPageId },
    select: { id: true, coreKey: true, hidden: true, visibility: true },
  });
  const coreDefinitions = ENTITY_SHELL_CORE_PAGES[shell];
  if (!coreDefinitions) return undefined;
  if (stored) {
    const definition = stored.coreKey ? coreDefinitions.find((candidate) => candidate.key === stored.coreKey) : undefined;
    if (stored.coreKey && (!definition || (definition.dmOnly && !canViewDmOnly))) return undefined;
    if (!canReadCharacterPageTab(stored, access, role)) return undefined;
    return stored.id;
  }
  if (!requested.startsWith('core:')) return undefined;
  const coreKey = requested.slice('core:'.length);
  const definition = coreDefinitions.find((candidate) => candidate.key === coreKey);
  if (!definition || (definition.dmOnly && !canViewDmOnly)) return undefined;
  const existing = await fieldsDb.characterPageTab.findFirst({
    where: { campaignId, characterPageId: entityPageId, coreKey },
    select: { id: true, coreKey: true, hidden: true, visibility: true },
  });
  if (existing) return canReadCharacterPageTab(existing, access, role) ? existing.id : undefined;
  const row = await fieldsDb.characterPageTab.create({ data: {
    campaignId, characterPageId: entityPageId, origin: 'CORE', renderMode: 'CORE',
    coreKey, title: definition.title, displayOrder: coreDefinitions.findIndex((candidate) => candidate.key === coreKey) * 10,
    blocks: [],
  }, select: { id: true } });
  return row.id;
}

function parseValidation(raw: unknown): { validation: CharacterFieldValidation; error: string | null } {
  if (raw == null) return { validation: {}, error: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { validation: {}, error: 'validation must be an object' };
  const input = raw as Record<string, unknown>;
  const unknown = Object.keys(input).find((key) => !VALIDATION_KEYS.has(key));
  if (unknown) return { validation: {}, error: `Unsupported validation rule: ${unknown}` };
  const validation: CharacterFieldValidation = {};
  if (input.required !== undefined) {
    if (typeof input.required !== 'boolean') return { validation: {}, error: 'validation.required must be boolean' };
    validation.required = input.required;
  }
  for (const key of ['min', 'max'] as const) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) {
      return { validation: {}, error: `validation.${key} must be a finite number` };
    }
    validation[key] = input[key];
  }
  if (validation.min != null && validation.max != null && validation.min > validation.max) {
    return { validation: {}, error: 'validation.min cannot exceed validation.max' };
  }
  if (input.maxLength !== undefined) {
    if (!Number.isInteger(input.maxLength) || (input.maxLength as number) < 0 || (input.maxLength as number) > MAX_FIELD_LENGTH) {
      return { validation: {}, error: `validation.maxLength must be an integer from 0 to ${MAX_FIELD_LENGTH}` };
    }
    validation.maxLength = input.maxLength as number;
  }
  if (input.options !== undefined) {
    if (!Array.isArray(input.options) || input.options.length > MAX_ENUM_OPTIONS
      || input.options.some((option) => typeof option !== 'string' || option.length > MAX_ENUM_OPTION_LENGTH)) {
      return { validation: {}, error: `validation.options must contain at most ${MAX_ENUM_OPTIONS} strings of at most ${MAX_ENUM_OPTION_LENGTH} characters` };
    }
    validation.options = [...input.options] as string[];
  }
  return { validation, error: null };
}

function pluginFieldKey(pluginId: string, sourceKey: string, providerKey: string): string {
  return `plugin:${pluginId}:${sourceKey}:${providerKey}`;
}

function validateValue(type: CharacterFieldType, value: unknown, rules: CharacterFieldValidation): string | null {
  // JavaScript RegExp cannot be given a reliable execution deadline. Never
  // execute campaign- or plugin-authored patterns in the shared API process.
  if (rules.pattern != null) return 'Regular-expression validation patterns are not supported';
  if (value == null) return rules.required ? 'A value is required' : null;
  if (type === 'STRING' || type === 'DATE' || type === 'ENUM') {
    if (typeof value !== 'string') return `Value must be a ${type.toLowerCase()}`;
    if (rules.maxLength != null && value.length > rules.maxLength) return `Value exceeds ${rules.maxLength} characters`;
    if (type === 'DATE' && Number.isNaN(Date.parse(value))) return 'Value must be a valid date';
    if (type === 'ENUM' && rules.options && !rules.options.includes(value)) return 'Value is not an allowed option';
  } else if (type === 'NUMBER') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Value must be a finite number';
    if (rules.min != null && value < rules.min) return `Value must be at least ${rules.min}`;
    if (rules.max != null && value > rules.max) return `Value must be at most ${rules.max}`;
  } else if (type === 'BOOLEAN' && typeof value !== 'boolean') {
    return 'Value must be boolean';
  }
  try { JSON.stringify(value); } catch { return 'Value must be JSON serializable'; }
  return null;
}

function descriptor(row: any, canEdit: boolean): CharacterFieldDescriptor {
  const validation = row.validation && typeof row.validation === 'object' ? row.validation : {};
  const declared = row.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {};
  return {
    id: row.id,
    key: row.origin === 'PLUGIN' ? row.providerKey : row.fieldKey,
    label: row.label,
    type: row.fieldType,
    value: row.value ?? null,
    origin: row.origin,
    pageId: row.pageTab?.coreKey ? `core:${row.pageTab.coreKey}` : row.pageTabId,
    displayOrder: row.displayOrder ?? 0,
    ...(row.pluginId ? { pluginId: row.pluginId } : {}),
    ...(row.apiSourceId ? { apiSourceId: row.apiSourceId } : {}),
    ...(row.apiSourceName ? { apiSourceName: row.apiSourceName } : {}),
    ...(row.sourceKey ? { sourceKey: row.sourceKey } : {}),
    ...(row.providerKey ? { providerKey: row.providerKey } : {}),
    validation,
    capabilities: {
      readable: declared.readable !== false,
      writable: canEdit && declared.writable !== false,
      deletable: canEdit && isUserDeletableCharacterResource(row.origin),
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensurePluginFields(campaignId: string, characterPageId: string): Promise<void> {
  const definitions = await listEnabledCampaignCharacterPageDefinitions(campaignId);
  const tabs = await fieldsDb.characterPageTab.findMany({
    where: { campaignId, characterPageId, origin: 'PLUGIN' },
    include: { pluginState: true },
  });
  const removedStates = await (prisma as typeof prisma & { pluginCharacterPageState: any }).pluginCharacterPageState.findMany({
    where: { campaignId, characterPageId, providerState: 'REMOVED' },
    select: { pluginId: true, sourceKey: true },
  });
  const removed = new Set(removedStates.map((state: any) => `${state.pluginId}:${state.sourceKey}`));
  for (const { pluginId, definition } of definitions) {
    if (removed.has(`${pluginId}:${definition.key}`)) continue;
    const pageTabId = tabs.find((tab: any) => tab.pluginState?.pluginId === pluginId && tab.pluginState?.sourceKey === definition.key)?.id ?? null;
    for (const field of definition.fields ?? []) {
      const fieldKey = pluginFieldKey(pluginId, definition.key, field.key);
      const declared = field.capabilities ?? [];
      await fieldsDb.characterField.upsert({
        where: { characterPageId_fieldKey: { characterPageId, fieldKey } },
        create: {
          campaignId, characterPageId, pageTabId, fieldKey, origin: 'PLUGIN', pluginId,
          sourceKey: definition.key, providerKey: field.key, label: field.label,
          fieldType: field.type, value: toNullableInputJsonValue(field.defaultValue ?? null),
          validation: toInputJsonValue(field.validation ?? {}),
          capabilities: toInputJsonValue({ readable: true, writable: !declared.includes('read-only') }),
        },
        update: {
          pageTabId, label: field.label, fieldType: field.type,
          validation: toInputJsonValue(field.validation ?? {}),
          capabilities: toInputJsonValue({ readable: true, writable: !declared.includes('read-only') }),
        },
      });
    }
  }
}

export async function listCharacterFields(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (access.isCharacter) await ensurePluginFields(req.campaign!.campaignId, access.page.id);
  const rows = await fieldsDb.characterField.findMany({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    include: { pageTab: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const states = await (prisma as typeof prisma & { pluginCharacterPageState: any }).pluginCharacterPageState.findMany({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    select: { pluginId: true, sourceKey: true, providerState: true },
  });
  const available = new Set(states.filter((state: any) => state.providerState === 'AVAILABLE').map((state: any) => `${state.pluginId}:${state.sourceKey}`));
  const removed = new Set(states.filter((state: any) => state.providerState === 'REMOVED').map((state: any) => `${state.pluginId}:${state.sourceKey}`));
  for (const entry of access.isCharacter ? await listEnabledCampaignCharacterPageDefinitions(req.campaign!.campaignId) : []) {
    const key = `${entry.pluginId}:${entry.definition.key}`;
    if (!removed.has(key)) available.add(key);
  }
  const visibleRows = rows.filter((row: any) => {
    const declared = row.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {};
    if (declared.readable === false) return false;
    if (row.origin === 'PLUGIN' && !available.has(`${row.pluginId}:${row.sourceKey}`)) return false;
    return !row.pageTab || canReadCharacterPageTab(row.pageTab, access, req.campaign!.role);
  });
  res.json({ fields: visibleRows.map((row: any) => descriptor(
    row,
    access.canEdit && (row.origin !== 'PLUGIN' || available.has(`${row.pluginId}:${row.sourceKey}`)),
  )) });
}

export async function createCustomCharacterField(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) { res.status(403).json({ error: 'Forbidden: cannot edit this character' }); return; }
  const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
  const fieldType = req.body?.type as CharacterFieldType;
  const parsedValidation = parseValidation(req.body?.validation);
  if (!label || label.length > 100 || !FIELD_TYPES.has(fieldType)) {
    res.status(400).json({ error: 'label and a valid field type are required' }); return;
  }
  if (parsedValidation.error) { res.status(400).json({ error: parsedValidation.error }); return; }
  const validation = parsedValidation.validation;
  const problem = validateValue(fieldType, req.body?.value ?? null, validation);
  if (problem) { res.status(400).json({ error: problem }); return; }
  let pageTabId: string | null = null;
  if (req.body?.pageId != null) {
    const resolved = await resolveFieldPageTab(
      req.campaign!.campaignId, access.page.id, access.shell, access.canViewDmOnly,
      access, req.campaign!.role, req.body.pageId,
    );
    if (resolved === undefined) { res.status(400).json({ error: 'pageId is not a page of this entity' }); return; }
    pageTabId = resolved;
  }
  const id = randomUUID();
  const last = await fieldsDb.characterField.findFirst({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id, pageTabId },
    orderBy: { displayOrder: 'desc' }, select: { displayOrder: true },
  });
  const provenance = characterResourceProvenance(req);
  const row = await fieldsDb.characterField.create({
    data: {
      id, campaignId: req.campaign!.campaignId, characterPageId: access.page.id,
      pageTabId,
      fieldKey: id, origin: provenance.origin,
      apiSourceId: provenance.apiSourceId, apiSourceName: provenance.apiSourceName,
      label, fieldType, displayOrder: (last?.displayOrder ?? -10) + 10,
      value: toNullableInputJsonValue(req.body?.value ?? null), validation: toInputJsonValue(validation),
      capabilities: toInputJsonValue({ readable: true, writable: true }),
    },
    include: { pageTab: true },
  });
  dispatchDomainEvent({ type: CoreDomainEvents.CHARACTER_FIELD_CREATED, campaignId: req.campaign!.campaignId,
    actorId: req.user?.id, resourceType: 'character_field', resourceId: access.page.id,
    payload: { fieldId: row.id, fieldKey: row.fieldKey, origin: row.origin } });
  {
    const { upsertWikiPageDocument } = await import('../lib/search/index/searchIndexService.js');
    await upsertWikiPageDocument(prisma, req.campaign!.campaignId, access.page.id);
  }
  res.status(201).json({ field: descriptor(row, true) });
}

export async function updateCharacterField(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) { res.status(403).json({ error: 'Forbidden: cannot edit this character' }); return; }
  const row = await fieldsDb.characterField.findFirst({
    where: { id: String(req.params.fieldId), campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    include: { pageTab: true },
  });
  if (!row) { res.status(404).json({ error: 'Character field not found' }); return; }
  if (row.pageTab && !canReadCharacterPageTab(row.pageTab, access, req.campaign!.role)) {
    res.status(403).json({ error: 'Forbidden: field page is not visible to your role' }); return;
  }
  const capabilities = row.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {};
  if (capabilities.writable === false) { res.status(403).json({ error: 'Field is read-only' }); return; }
  if (row.origin === 'PLUGIN') {
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'label')
      || Object.prototype.hasOwnProperty.call(req.body ?? {}, 'pageId')) {
      res.status(400).json({ error: 'Provider-managed field labels and page placement cannot be changed' });
      return;
    }
    const states = await (prisma as typeof prisma & { pluginCharacterPageState: any }).pluginCharacterPageState.findMany({
      where: {
        campaignId: req.campaign!.campaignId,
        characterPageId: access.page.id,
        pluginId: row.pluginId,
        sourceKey: row.sourceKey,
      },
      select: { providerState: true },
    });
    const definitions = await listEnabledCampaignCharacterPageDefinitions(req.campaign!.campaignId);
    const definitionAvailable = definitions.some((entry) => entry.pluginId === row.pluginId && entry.definition.key === row.sourceKey);
    const providerAvailable = states.length > 0
      ? states.some((state: any) => state.providerState === 'AVAILABLE')
      : definitionAvailable;
    if (!providerAvailable) { res.status(409).json({ error: 'Plugin provider is unavailable' }); return; }
  }
  const parsedStoredValidation = parseValidation(row.validation);
  if (parsedStoredValidation.error) { res.status(400).json({ error: 'Field has invalid stored validation rules' }); return; }
  const nextValue = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'value') ? req.body.value : row.value;
  const problem = validateValue(row.fieldType, nextValue, parsedStoredValidation.validation);
  if (problem) { res.status(400).json({ error: problem }); return; }
  let pageTabId = row.pageTabId;
  if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'pageId')) {
    if (req.body.pageId == null) pageTabId = null;
    else {
      const resolved = await resolveFieldPageTab(
        req.campaign!.campaignId, access.page.id, access.shell, access.canViewDmOnly,
        access, req.campaign!.role, req.body.pageId,
      );
      if (resolved === undefined) { res.status(400).json({ error: 'pageId is not a page of this entity' }); return; }
      pageTabId = resolved;
    }
  }
  const label = typeof req.body?.label === 'string' ? req.body.label.trim() : row.label;
  if (!label || label.length > 100) { res.status(400).json({ error: 'label must be 1 to 100 characters' }); return; }
  const displayOrder = Number.isInteger(req.body?.displayOrder) ? req.body.displayOrder : row.displayOrder;
  const updated = await fieldsDb.characterField.update({
    where: { id: row.id },
    data: { value: toNullableInputJsonValue(nextValue), label, pageTabId, displayOrder },
    include: { pageTab: true },
  });
  dispatchDomainEvent({ type: CoreDomainEvents.CHARACTER_FIELD_UPDATED, campaignId: req.campaign!.campaignId,
    actorId: req.user?.id, resourceType: 'character_field', resourceId: access.page.id,
    payload: { fieldId: row.id, fieldKey: row.fieldKey, origin: row.origin, updatedAt: updated.updatedAt.toISOString() } });
  {
    const { upsertWikiPageDocument } = await import('../lib/search/index/searchIndexService.js');
    await upsertWikiPageDocument(prisma, req.campaign!.campaignId, access.page.id);
  }
  res.json({ field: descriptor(updated, true) });
}

export async function deleteCustomCharacterField(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) { res.status(403).json({ error: 'Forbidden: cannot edit this character' }); return; }
  const row = await fieldsDb.characterField.findFirst({
    where: { id: String(req.params.fieldId), campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    include: { pageTab: true },
  });
  if (!row) { res.status(404).json({ error: 'Character field not found' }); return; }
  if (row.pageTab && !canReadCharacterPageTab(row.pageTab, access, req.campaign!.role)) {
    res.status(403).json({ error: 'Forbidden: field page is not visible to your role' }); return;
  }
  if (!isUserDeletableCharacterResource(row.origin)) { res.status(400).json({ error: 'Provider-managed fields cannot be deleted here' }); return; }
  await fieldsDb.characterField.delete({ where: { id: row.id } });
  dispatchDomainEvent({ type: CoreDomainEvents.CHARACTER_FIELD_DELETED, campaignId: req.campaign!.campaignId,
    actorId: req.user?.id, resourceType: 'character_field', resourceId: access.page.id,
    payload: { fieldId: row.id, fieldKey: row.fieldKey, origin: row.origin } });
  {
    const { upsertWikiPageDocument } = await import('../lib/search/index/searchIndexService.js');
    await upsertWikiPageDocument(prisma, req.campaign!.campaignId, access.page.id);
  }
  res.status(204).end();
}
