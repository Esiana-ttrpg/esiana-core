import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { canViewWikiPage } from '../lib/wikiTree.js';
import { isCharacterWikiPage } from '../lib/memberIdentity.js';
import { canEditPage, type PageOwnerType } from '../../../shared/campaignPolicy/pageOwnership.js';
import { canManageNotebooksFromActor, hasElevatedNarrativeView } from '../lib/acl.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { validateWikiBlocksAssetReferences } from '../lib/assetReferenceValidation.js';
import { toInputJsonValue } from '../lib/inputJsonValue.js';
import { listEnabledCampaignCharacterPageDefinitions } from '../lib/campaignPlugins.js';
import {
  CHARACTER_CORE_PAGE_KEYS,
  type CharacterCorePageKey,
  type CharacterPageDescriptor,
  type PluginPageRemovalMode,
} from '../../../shared/characterPages.js';
import {
  CORE_CHARACTER_PAGE_ORDER,
  CORE_CHARACTER_PAGE_TITLES,
  normalizeCharacterPageBlocks,
  normalizeCharacterPageTitle,
} from '../lib/characterPages.js';

const characterDb = prisma as typeof prisma & {
  characterPageTab: any;
  pluginCharacterPageState: any;
};

const VALID_VISIBILITY = new Set(['Public', 'Party', 'DM_Only']);
const MAX_PLUGIN_DATA_BYTES = 256 * 1024;

export function canReadCharacterPageTab(
  row: { hidden: boolean; visibility: string | null },
  access: { canEdit: boolean },
  role: CampaignMemberRole | null,
): boolean {
  return (access.canEdit || !row.hidden)
    && (row.visibility == null || canViewWikiPage(row.visibility, role));
}

export async function loadCharacterPageAccess(req: CampaignScopedRequest, res: Response) {
  const ctx = req.campaign!;
  const characterPageId = String(req.params.pageId);
  const page = await prisma.wikiPage.findFirst({
    where: { id: characterPageId, campaignId: ctx.campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      templateType: true,
      metadata: true,
      visibility: true,
      ownerType: true,
      ownerUserId: true,
      ownerPartyId: true,
    },
  });
  if (!page || !isCharacterWikiPage(page)) {
    res.status(404).json({ error: 'Character not found' });
    return null;
  }
  if (!canViewWikiPage(page.visibility, ctx.role)) {
    res.status(403).json({ error: 'Forbidden: character is not visible to your role' });
    return null;
  }
  const canEdit = canEditPage(ctx.actor, {
    ownerType: page.ownerType as PageOwnerType,
    ownerUserId: page.ownerUserId,
    ownerPartyId: page.ownerPartyId,
  });
  return { page, canEdit, canManagePlugins: canManageNotebooksFromActor(ctx.actor) };
}

function serializeStoredTab(row: any, canEdit: boolean): CharacterPageDescriptor {
  const plugin = row.pluginState ?? null;
  const origin = row.origin as CharacterPageDescriptor['origin'];
  const renderMode = row.renderMode as CharacterPageDescriptor['renderMode'];
  const definition = plugin?.definition && typeof plugin.definition === 'object' && !Array.isArray(plugin.definition)
    ? plugin.definition as Record<string, any>
    : null;
  return {
    id: row.id,
    key:
      origin === 'CORE'
        ? row.coreKey
        : origin === 'PLUGIN'
          ? `plugin:${plugin?.pluginId ?? 'unknown'}:${plugin?.sourceKey ?? row.id}`
          : `custom:${row.id}`,
    title: row.title,
    origin,
    renderMode,
    displayOrder: row.displayOrder,
    hidden: row.hidden,
    visibility: row.visibility,
    ...(row.coreKey ? { coreKey: row.coreKey } : {}),
    ...(plugin
      ? {
          pluginId: plugin.pluginId,
          sourceKey: plugin.sourceKey,
          renderer: plugin.renderer ?? undefined,
          pluginSchemaVersion: plugin.pluginSchemaVersion,
          providerState: plugin.providerState,
        }
      : {}),
    ...(renderMode === 'CANVAS' ? { blocks: Array.isArray(row.blocks) ? row.blocks : [] } : {}),
    capabilities: {
      canEdit,
      canRename: canEdit && origin === 'CUSTOM',
      canReorder: canEdit && row.coreKey !== 'overview',
      canHide: canEdit && row.coreKey !== 'overview',
      canDelete: canEdit && origin === 'CUSTOM',
      allowAddWidget: canEdit && renderMode === 'CANVAS' && (origin !== 'PLUGIN' || definition?.canvas?.allowAddWidget === true),
      allowArrange: canEdit && renderMode === 'CANVAS' && (origin !== 'PLUGIN' || definition?.canvas?.allowArrange === true),
    },
  };
}

export async function listCharacterPages(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  const ctx = req.campaign!;
  const rows = await characterDb.characterPageTab.findMany({
    where: { campaignId: ctx.campaignId, characterPageId: access.page.id },
    include: { pluginState: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const byCoreKey = new Map(rows.filter((row: any) => row.coreKey).map((row: any) => [row.coreKey, row]));
  const core = CHARACTER_CORE_PAGE_KEYS.map((coreKey) => {
    const stored = byCoreKey.get(coreKey);
    if (stored) return serializeStoredTab(stored, access.canEdit);
    return {
      id: `core:${coreKey}`,
      key: coreKey,
      title: CORE_CHARACTER_PAGE_TITLES[coreKey],
      origin: 'CORE' as const,
      renderMode: 'CORE' as const,
      displayOrder: CORE_CHARACTER_PAGE_ORDER.get(coreKey) ?? 0,
      hidden: false,
      visibility: null,
      coreKey,
      capabilities: {
        canEdit: access.canEdit,
        canRename: false,
        canReorder: access.canEdit && coreKey !== 'overview',
        canHide: access.canEdit && coreKey !== 'overview',
        canDelete: false,
        allowAddWidget: false,
        allowArrange: false,
      },
    } satisfies CharacterPageDescriptor;
  });
  const elevated = hasElevatedNarrativeView(ctx.actor);
  const storedNonCore: CharacterPageDescriptor[] = rows
    .filter((row: any) => row.origin !== 'CORE')
    .filter((row: any) => row.pluginState?.providerState !== 'UNAVAILABLE')
    .map((row: any) => serializeStoredTab(row, access.canEdit));
  const states = await characterDb.pluginCharacterPageState.findMany({
    where: { campaignId: ctx.campaignId, characterPageId: access.page.id },
    select: { pluginId: true, sourceKey: true },
  });
  // A state without a tab is a durable removal/retention tombstone. Do not
  // immediately recreate it as a virtual page while its plugin stays enabled.
  const materializedKeys = new Set([
    ...storedNonCore.map((page) => `${page.pluginId ?? ''}:${page.sourceKey ?? ''}`),
    ...states.map((state: any) => `${state.pluginId}:${state.sourceKey}`),
  ]);
  const definitions = await listEnabledCampaignCharacterPageDefinitions(ctx.campaignId);
  const virtualPluginPages: CharacterPageDescriptor[] = definitions
    .filter(() => access.canEdit)
    .filter(({ pluginId, definition }) => !materializedKeys.has(`${pluginId}:${definition.key}`))
    .map(({ pluginId, definition }, index) => ({
      id: `virtual:${pluginId}:${definition.key}`,
      key: `plugin:${pluginId}:${definition.key}`,
      title: definition.title,
      origin: 'PLUGIN',
      renderMode: definition.renderMode,
      displayOrder: 1000 + index * 10,
      hidden: false,
      visibility: definition.defaultVisibility ?? access.page.visibility,
      pluginId,
      sourceKey: definition.key,
      renderer: definition.renderer,
      pluginSchemaVersion: definition.schemaVersion,
      providerState: 'AVAILABLE',
      capabilities: {
        canEdit: access.canEdit,
        canRename: false,
        canReorder: false,
        // Virtual definitions have no persisted tab to mutate yet. They become
        // hideable after first use materializes the page idempotently.
        canHide: false,
        canDelete: false,
        allowAddWidget: access.canEdit && definition.renderMode === 'CANVAS' && definition.canvas?.allowAddWidget === true,
        allowArrange: access.canEdit && definition.renderMode === 'CANVAS' && definition.canvas?.allowArrange === true,
      },
    }));
  const pages = [...core, ...storedNonCore, ...virtualPluginPages]
    .filter((page) => elevated || (page.coreKey !== 'discovery' && page.coreKey !== 'continuity'))
    .filter((page) => access.canEdit || !page.hidden)
    .filter((page) => page.visibility == null || canViewWikiPage(page.visibility, ctx.role))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title));
  res.json({ pages, canEdit: access.canEdit, canManagePlugins: access.canManagePlugins });
}

export async function materializePluginCharacterPage(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) {
    res.status(403).json({ error: 'Forbidden: cannot edit this character' });
    return;
  }
  const pluginId = typeof req.body?.pluginId === 'string' ? req.body.pluginId : '';
  const sourceKey = typeof req.body?.sourceKey === 'string' ? req.body.sourceKey : '';
  const available = await listEnabledCampaignCharacterPageDefinitions(req.campaign!.campaignId);
  const found = available.find((entry) => entry.pluginId === pluginId && entry.definition.key === sourceKey);
  if (!found) {
    res.status(404).json({ error: 'Enabled plugin page definition not found' });
    return;
  }
  const definition = found.definition;
  const last = await characterDb.characterPageTab.findFirst({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
  let tab: any;
  try {
    tab = await prisma.$transaction(async (tx) => {
      const db = tx as typeof tx & { characterPageTab: any; pluginCharacterPageState: any; characterField: any };
      let state = await db.pluginCharacterPageState.findUnique({
        where: { characterPageId_pluginId_sourceKey: { characterPageId: access.page.id, pluginId, sourceKey } },
        include: { tab: true },
      });
      if (state?.tab) return state.tab;
      state = await db.pluginCharacterPageState.upsert({
        where: { characterPageId_pluginId_sourceKey: { characterPageId: access.page.id, pluginId, sourceKey } },
        create: {
          campaignId: req.campaign!.campaignId,
          characterPageId: access.page.id,
          pluginId,
          sourceKey,
          pluginSchemaVersion: definition.schemaVersion,
          providerState: 'AVAILABLE',
          renderer: definition.renderer,
          definition: toInputJsonValue(definition),
        },
        update: {
          providerState: 'AVAILABLE',
          renderer: definition.renderer,
          definition: toInputJsonValue(definition),
        },
      });
      return db.characterPageTab.create({
        data: {
          campaignId: req.campaign!.campaignId,
          characterPageId: access.page.id,
          origin: 'PLUGIN',
          renderMode: state.retainedRenderMode ?? definition.renderMode,
          title: state.retainedTitle ?? definition.title,
          displayOrder: state.retainedDisplayOrder ?? Math.max(last?.displayOrder ?? 50, 50) + 10,
          visibility: state.retainedVisibility ?? definition.defaultVisibility ?? access.page.visibility,
          blocks: state.retainedBlocks ?? [],
          pluginStateId: state.id,
        },
      });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    tab = await characterDb.characterPageTab.findFirst({
      where: {
        campaignId: req.campaign!.campaignId,
        characterPageId: access.page.id,
        pluginState: { is: { pluginId, sourceKey } },
      },
    });
    if (!tab) throw error;
  }
  const row = await characterDb.characterPageTab.findUnique({ where: { id: tab.id }, include: { pluginState: true } });
  res.status(201).json({ page: serializeStoredTab(row, access.canEdit) });
}

export async function createCustomCharacterPage(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit) {
    res.status(403).json({ error: 'Forbidden: cannot edit this character' });
    return;
  }
  const title = normalizeCharacterPageTitle(req.body?.title);
  if (!title) {
    res.status(400).json({ error: 'title must be 1 to 100 characters' });
    return;
  }
  const last = await characterDb.characterPageTab.findFirst({
    where: { campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
  const row = await characterDb.characterPageTab.create({
    data: {
      campaignId: req.campaign!.campaignId,
      characterPageId: access.page.id,
      origin: 'CUSTOM',
      renderMode: 'CANVAS',
      title,
      displayOrder: Math.max(last?.displayOrder ?? 50, 50) + 10,
      visibility: access.page.visibility,
      blocks: [],
    },
    include: { pluginState: true },
  });
  res.status(201).json({ page: serializeStoredTab(row, true) });
}

async function loadStoredTab(req: CampaignScopedRequest, res: Response, requireEdit = false) {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return null;
  if (requireEdit && !access.canEdit) {
    res.status(403).json({ error: 'Forbidden: cannot edit this character' });
    return null;
  }
  const row = await characterDb.characterPageTab.findFirst({
    where: {
      id: String(req.params.tabId),
      campaignId: req.campaign!.campaignId,
      characterPageId: access.page.id,
    },
    include: { pluginState: true },
  });
  if (!row) {
    res.status(404).json({ error: 'Character page not found' });
    return null;
  }
  if (!requireEdit && !canReadCharacterPageTab(row, access, req.campaign!.role)) {
    res.status(403).json({ error: 'Forbidden: character page is not visible to your role' });
    return null;
  }
  return { access, row };
}

export async function updateCharacterPage(req: CampaignScopedRequest, res: Response): Promise<void> {
  const requestedId = String(req.params.tabId);
  if (requestedId.startsWith('core:')) {
    const access = await loadCharacterPageAccess(req, res);
    if (!access) return;
    if (!access.canEdit) {
      res.status(403).json({ error: 'Forbidden: cannot edit this character' });
      return;
    }
    const coreKey = requestedId.slice(5);
    if (!CHARACTER_CORE_PAGE_KEYS.includes(coreKey as CharacterCorePageKey) || coreKey === 'overview') {
      res.status(400).json({ error: 'Invalid core character page' });
      return;
    }
    if (typeof req.body?.hidden !== 'boolean') {
      res.status(400).json({ error: 'Core pages only support a boolean hidden update' });
      return;
    }
    const row = await characterDb.characterPageTab.upsert({
      where: { characterPageId_coreKey: { characterPageId: access.page.id, coreKey } },
      create: {
        campaignId: req.campaign!.campaignId,
        characterPageId: access.page.id,
        origin: 'CORE',
        renderMode: 'CORE',
        coreKey,
        title: CORE_CHARACTER_PAGE_TITLES[coreKey as CharacterCorePageKey],
        displayOrder: CORE_CHARACTER_PAGE_ORDER.get(coreKey) ?? 0,
        hidden: req.body.hidden,
      },
      update: { hidden: req.body.hidden },
      include: { pluginState: true },
    });
    res.json({ page: serializeStoredTab(row, true) });
    return;
  }
  const loaded = await loadStoredTab(req, res, true);
  if (!loaded) return;
  const { row } = loaded;
  const data: Record<string, unknown> = {};
  if (req.body?.title !== undefined) {
    if (row.origin !== 'CUSTOM') {
      res.status(400).json({ error: 'Only custom pages can be renamed' });
      return;
    }
    const title = normalizeCharacterPageTitle(req.body.title);
    if (!title) {
      res.status(400).json({ error: 'title must be 1 to 100 characters' });
      return;
    }
    data.title = title;
  }
  if (req.body?.hidden !== undefined) {
    if (row.coreKey === 'overview' || typeof req.body.hidden !== 'boolean') {
      res.status(400).json({ error: 'Overview cannot be hidden; hidden must be boolean' });
      return;
    }
    data.hidden = req.body.hidden;
  }
  if (req.body?.visibility !== undefined) {
    if (req.body.visibility !== null && !VALID_VISIBILITY.has(req.body.visibility)) {
      res.status(400).json({ error: 'Invalid visibility' });
      return;
    }
    data.visibility = req.body.visibility;
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'title, hidden, or visibility is required' });
    return;
  }
  const updated = await characterDb.characterPageTab.update({
    where: { id: row.id },
    data,
    include: { pluginState: true },
  });
  res.json({ page: serializeStoredTab(updated, true) });
}

export async function reorderCharacterPages(req: CampaignScopedRequest, res: Response): Promise<void> {
  const access = await loadCharacterPageAccess(req, res);
  if (!access) return;
  if (!access.canEdit || !Array.isArray(req.body?.keys)) {
    res.status(access.canEdit ? 400 : 403).json({ error: access.canEdit ? 'keys must be an array' : 'Forbidden' });
    return;
  }
  const keys = req.body.keys.filter((key: unknown): key is string => typeof key === 'string');
  if (keys[0] !== 'overview' || new Set(keys).size !== keys.length) {
    res.status(400).json({ error: 'Overview must remain first and keys must be unique' });
    return;
  }
  await prisma.$transaction(async (tx) => {
    const db = tx as typeof tx & { characterPageTab: any };
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!;
      const displayOrder = index * 10;
      if ((CHARACTER_CORE_PAGE_KEYS as readonly string[]).includes(key)) {
        const coreKey = key as CharacterCorePageKey;
        await db.characterPageTab.upsert({
          where: { characterPageId_coreKey: { characterPageId: access.page.id, coreKey } },
          create: {
            campaignId: req.campaign!.campaignId,
            characterPageId: access.page.id,
            origin: 'CORE',
            renderMode: 'CORE',
            coreKey,
            title: CORE_CHARACTER_PAGE_TITLES[coreKey],
            displayOrder,
          },
          update: { displayOrder },
        });
      } else if (key.startsWith('custom:')) {
        await db.characterPageTab.updateMany({
          where: { id: key.slice(7), campaignId: req.campaign!.campaignId, characterPageId: access.page.id },
          data: { displayOrder },
        });
      } else if (key.startsWith('plugin:')) {
        const [, pluginId, ...sourceParts] = key.split(':');
        const sourceKey = sourceParts.join(':');
        const row = await db.characterPageTab.findFirst({
          where: {
            campaignId: req.campaign!.campaignId,
            characterPageId: access.page.id,
            pluginState: { is: { pluginId, sourceKey } },
          },
          include: { pluginState: true },
        });
        if (row) await db.characterPageTab.update({ where: { id: row.id }, data: { displayOrder } });
      }
    }
  });
  res.status(204).end();
}

export async function updateCharacterPageBlocks(req: CampaignScopedRequest, res: Response): Promise<void> {
  const loaded = await loadStoredTab(req, res, true);
  if (!loaded) return;
  if (loaded.row.renderMode !== 'CANVAS') {
    res.status(400).json({ error: 'Only canvas pages store Esiana blocks' });
    return;
  }
  const blocks = normalizeCharacterPageBlocks(req.body?.blocks);
  if (!blocks) {
    res.status(400).json({ error: 'blocks must be an array of at most 200 objects' });
    return;
  }
  try {
    validateWikiBlocksAssetReferences(blocks);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid asset reference' });
    return;
  }
  const updated = await characterDb.characterPageTab.update({
    where: { id: loaded.row.id },
    data: { blocks: toInputJsonValue(blocks) },
    include: { pluginState: true },
  });
  res.json({ page: serializeStoredTab(updated, true) });
}

export async function deleteCustomCharacterPage(req: CampaignScopedRequest, res: Response): Promise<void> {
  const loaded = await loadStoredTab(req, res, true);
  if (!loaded) return;
  if (loaded.row.origin !== 'CUSTOM') {
    res.status(400).json({ error: 'Only custom pages can be deleted here' });
    return;
  }
  await characterDb.characterPageTab.delete({ where: { id: loaded.row.id } });
  res.status(204).end();
}

export async function duplicateCharacterPageToCustom(req: CampaignScopedRequest, res: Response): Promise<void> {
  const loaded = await loadStoredTab(req, res, true);
  if (!loaded) return;
  if (loaded.row.origin === 'CORE') {
    res.status(400).json({ error: 'Core pages cannot be duplicated' });
    return;
  }
  const title = normalizeCharacterPageTitle(req.body?.title) ?? `${loaded.row.title} copy`;
  const duplicate = await characterDb.characterPageTab.create({
    data: {
      campaignId: req.campaign!.campaignId,
      characterPageId: loaded.access.page.id,
      origin: 'CUSTOM',
      renderMode: 'CANVAS',
      title,
      displayOrder: loaded.row.displayOrder + 1,
      visibility: loaded.row.visibility,
      blocks: loaded.row.renderMode === 'CANVAS' ? loaded.row.blocks : [],
    },
    include: { pluginState: true },
  });
  res.status(201).json({
    page: serializeStoredTab(duplicate, true),
    conversion: {
      portable: loaded.row.renderMode === 'CANVAS',
      omitted: loaded.row.renderMode === 'PLUGIN' ? ['plugin renderer', 'opaque plugin data'] : [],
    },
  });
}

export async function getPluginCharacterPageData(req: CampaignScopedRequest, res: Response): Promise<void> {
  const loaded = await loadStoredTab(req, res);
  if (!loaded) return;
  const state = loaded.row.pluginState;
  if (!state || state.providerState !== 'AVAILABLE') {
    res.status(409).json({ error: 'Plugin provider is unavailable' });
    return;
  }
  res.json({ data: state.pluginData ?? null, schemaVersion: state.pluginSchemaVersion });
}

export async function updatePluginCharacterPageData(req: CampaignScopedRequest, res: Response): Promise<void> {
  const loaded = await loadStoredTab(req, res, true);
  if (!loaded) return;
  const state = loaded.row.pluginState;
  if (!state || state.providerState !== 'AVAILABLE') {
    res.status(409).json({ error: 'Plugin provider is unavailable' });
    return;
  }
  if (req.body?.schemaVersion !== state.pluginSchemaVersion) {
    res.status(409).json({ error: 'Plugin schema version is stale', schemaVersion: state.pluginSchemaVersion });
    return;
  }
  let encoded: string;
  try {
    encoded = JSON.stringify(req.body?.data ?? null);
  } catch {
    res.status(400).json({ error: 'Plugin data must be JSON serializable' });
    return;
  }
  if (Buffer.byteLength(encoded, 'utf8') > MAX_PLUGIN_DATA_BYTES) {
    res.status(413).json({ error: `Plugin data exceeds ${MAX_PLUGIN_DATA_BYTES} bytes` });
    return;
  }
  const updated = await characterDb.pluginCharacterPageState.update({
    where: { id: state.id },
    data: { pluginData: toInputJsonValue(req.body?.data ?? null) },
  });
  res.json({ data: updated.pluginData ?? null, schemaVersion: updated.pluginSchemaVersion });
}

export async function removePluginCharacterPage(req: CampaignScopedRequest, res: Response): Promise<void> {
  const loaded = await loadStoredTab(req, res, true);
  if (!loaded) return;
  if (!loaded.access.canManagePlugins || loaded.row.origin !== 'PLUGIN' || !loaded.row.pluginState) {
    res.status(403).json({ error: 'Forbidden: cannot remove this plugin page' });
    return;
  }
  const mode = req.body?.mode as PluginPageRemovalMode;
  if (!['RETAIN_DATA', 'CONVERT_TO_CUSTOM', 'DELETE_DATA'].includes(mode)) {
    res.status(400).json({ error: 'Invalid plugin page removal mode' });
    return;
  }
  const row = loaded.row;
  await prisma.$transaction(async (tx) => {
    const db = tx as typeof tx & { characterPageTab: any; pluginCharacterPageState: any; characterField: any };
    if (mode === 'RETAIN_DATA') {
      await db.pluginCharacterPageState.update({
        where: { id: row.pluginState.id },
        data: {
          retainedBlocks: row.blocks,
          retainedTitle: row.title,
          retainedDisplayOrder: row.displayOrder,
          retainedVisibility: row.visibility,
          retainedRenderMode: row.renderMode,
          providerState: 'REMOVED',
        },
      });
      await db.characterPageTab.delete({ where: { id: row.id } });
    } else if (mode === 'CONVERT_TO_CUSTOM') {
      await db.pluginCharacterPageState.update({
        where: { id: row.pluginState.id },
        data: { providerState: 'REMOVED' },
      });
      await db.characterPageTab.update({
        where: { id: row.id },
        data: { origin: 'CUSTOM', renderMode: 'CANVAS', pluginStateId: null, blocks: row.renderMode === 'CANVAS' ? row.blocks : [] },
      });
    } else {
      await db.characterField.deleteMany({ where: {
        campaignId: req.campaign!.campaignId,
        characterPageId: loaded.access.page.id,
        pluginId: row.pluginState.pluginId,
        sourceKey: row.pluginState.sourceKey,
      } });
      await db.characterPageTab.delete({ where: { id: row.id } });
      await db.pluginCharacterPageState.update({
        where: { id: row.pluginState.id },
        data: {
          providerState: 'REMOVED',
          pluginData: toInputJsonValue(null),
          retainedBlocks: toInputJsonValue(null),
          retainedTitle: null,
          retainedDisplayOrder: null,
          retainedVisibility: null,
          retainedRenderMode: null,
        },
      });
    }
  });
  res.status(204).end();
}
