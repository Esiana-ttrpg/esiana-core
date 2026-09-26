import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { toInputJsonValue, toNullableInputJsonValue } from '../lib/inputJsonValue.js';
import { CoreDomainEvents, dispatchDomainEvent } from '../lib/domainEvents/index.js';
import { listEnabledCampaignCharacterPageDefinitions } from '../lib/campaignPlugins.js';
import { loadCharacterPageAccess } from './characterPagesController.js';
import type {
  CharacterFieldDescriptor,
  CharacterFieldType,
  CharacterFieldValidation,
  PluginCharacterFieldDefinition,
} from '../../../shared/characterPages.js';

const fieldsDb = prisma as typeof prisma & { characterField: any; characterPageTab: any };
const FIELD_TYPES = new Set<CharacterFieldType>(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'JSON']);

function pluginFieldKey(pluginId: string, sourceKey: string, providerKey: string): string {
  return `plugin:${pluginId}:${sourceKey}:${providerKey}`;
}

function validateValue(type: CharacterFieldType, value: unknown, rules: CharacterFieldValidation): string | null {
  if (value == null) return rules.required ? 'A value is required' : null;
  if (type === 'STRING' || type === 'DATE' || type === 'ENUM') {
    if (typeof value !== 'string') return `Value must be a ${type.toLowerCase()}`;
    if (rules.maxLength != null && value.length > rules.maxLength) return `Value exceeds ${rules.maxLength} characters`;
    if (type === 'DATE' && Number.isNaN(Date.parse(value))) return 'Value must be a valid date';
    if (type === 'ENUM' && rules.options && !rules.options.includes(value)) return 'Value is not an allowed option';
    if (rules.pattern) {
      try { if (!new RegExp(rules.pattern).test(value)) return 'Value does not match the required pattern'; }
      catch { return 'Field validation pattern is invalid'; }
    }
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
    pageId: row.pageTabId,
    ...(row.pluginId ? { pluginId: row.pluginId } : {}),
    ...(row.sourceKey ? { sourceKey: row.sourceKey } : {}),
    ...(row.providerKey ? { providerKey: row.providerKey } : {}),
    validation,
    capabilities: {
      readable: declared.readable !== false,
      writable: canEdit && declared.writable !== false,
      deletable: canEdit && row.origin === 'CUSTOM',
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
  for (const { pluginId, definition } of definitions) {
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
  await ensurePluginFields(req.campaign!.campaignId, access.page.id);
  const rows = await fieldsDb.characterField.findMany({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'asc' }],
  });
  const states = await (prisma as typeof prisma & { pluginCharacterPageState: any }).pluginCharacterPageState.findMany({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    select: { pluginId: true, sourceKey: true, providerState: true },
  });
  const available = new Set(states.filter((state: any) => state.providerState === 'AVAILABLE').map((state: any) => `${state.pluginId}:${state.sourceKey}`));
  for (const entry of await listEnabledCampaignCharacterPageDefinitions(req.campaign!.campaignId)) {
    available.add(`${entry.pluginId}:${entry.definition.key}`);
  }
  res.json({ fields: rows.map((row: any) => descriptor(
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
  const validation = req.body?.validation && typeof req.body.validation === 'object' && !Array.isArray(req.body.validation)
    ? req.body.validation as CharacterFieldValidation : {};
  if (!label || label.length > 100 || !FIELD_TYPES.has(fieldType)) {
    res.status(400).json({ error: 'label and a valid field type are required' }); return;
  }
  const problem = validateValue(fieldType, req.body?.value ?? null, validation);
  if (problem) { res.status(400).json({ error: problem }); return; }
  let pageTabId: string | null = null;
  if (typeof req.body?.pageId === 'string') {
    const tab = await fieldsDb.characterPageTab.findFirst({ where: {
      id: req.body.pageId, campaignId: req.campaign!.campaignId, characterPageId: access.page.id,
    }, select: { id: true } });
    if (!tab) { res.status(400).json({ error: 'pageId is not a page of this character' }); return; }
    pageTabId = tab.id;
  }
  const id = randomUUID();
  const row = await fieldsDb.characterField.create({ data: {
    id, campaignId: req.campaign!.campaignId, characterPageId: access.page.id,
    pageTabId,
    fieldKey: id, origin: 'CUSTOM', label, fieldType,
    value: toNullableInputJsonValue(req.body?.value ?? null), validation: toInputJsonValue(validation),
    capabilities: toInputJsonValue({ readable: true, writable: true }),
  }});
  dispatchDomainEvent({ type: CoreDomainEvents.CHARACTER_FIELD_CREATED, campaignId: req.campaign!.campaignId,
    actorId: req.user?.id, resourceType: 'character_field', resourceId: access.page.id,
    payload: { fieldId: row.id, fieldKey: row.fieldKey, origin: row.origin } });
  res.status(201).json({ field: descriptor(row, true) });
}

export async function updateCharacterField(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) { res.status(403).json({ error: 'Forbidden: cannot edit this character' }); return; }
  const row = await fieldsDb.characterField.findFirst({ where: {
    id: String(req.params.fieldId), campaignId: req.campaign!.campaignId, characterPageId: access.page.id,
  }});
  if (!row) { res.status(404).json({ error: 'Character field not found' }); return; }
  const capabilities = row.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {};
  if (capabilities.writable === false) { res.status(403).json({ error: 'Field is read-only' }); return; }
  const problem = validateValue(row.fieldType, req.body?.value, row.validation ?? {});
  if (problem) { res.status(400).json({ error: problem }); return; }
  const updated = await fieldsDb.characterField.update({ where: { id: row.id }, data: { value: toNullableInputJsonValue(req.body.value) } });
  dispatchDomainEvent({ type: CoreDomainEvents.CHARACTER_FIELD_UPDATED, campaignId: req.campaign!.campaignId,
    actorId: req.user?.id, resourceType: 'character_field', resourceId: access.page.id,
    payload: { fieldId: row.id, fieldKey: row.fieldKey, origin: row.origin, updatedAt: updated.updatedAt.toISOString() } });
  res.json({ field: descriptor(updated, true) });
}

export async function deleteCustomCharacterField(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) { res.status(403).json({ error: 'Forbidden: cannot edit this character' }); return; }
  const row = await fieldsDb.characterField.findFirst({ where: {
    id: String(req.params.fieldId), campaignId: req.campaign!.campaignId, characterPageId: access.page.id,
  }});
  if (!row) { res.status(404).json({ error: 'Character field not found' }); return; }
  if (row.origin !== 'CUSTOM') { res.status(400).json({ error: 'Plugin fields cannot be deleted by consumers' }); return; }
  await fieldsDb.characterField.delete({ where: { id: row.id } });
  dispatchDomainEvent({ type: CoreDomainEvents.CHARACTER_FIELD_DELETED, campaignId: req.campaign!.campaignId,
    actorId: req.user?.id, resourceType: 'character_field', resourceId: access.page.id,
    payload: { fieldId: row.id, fieldKey: row.fieldKey, origin: row.origin } });
  res.status(204).end();
}
