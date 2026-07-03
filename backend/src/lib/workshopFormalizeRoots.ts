import type { WorkshopFormalizeTarget } from '../../../shared/workshopDocument.js';
import {
  isWorkshopDraftMetadata,
  isWorkshopDraftsRootMetadata,
} from '../../../shared/workshopDocument.js';
import {
  getWorkshopFormalizeTargetDef,
  LORE_NOTE_FOLDER_TITLES,
} from '../../../shared/workshopFormalize.js';
import { ensureNarrativeScenesSystemCategoryKey } from './ensureNarrativeScenesSystemCategoryKey.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { prisma } from './prisma.js';

type PageRow = { id: string; title: string; parentId: string | null; metadata?: unknown };

async function loadCampaignPages(campaignId: string): Promise<PageRow[]> {
  return prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true, metadata: true },
  });
}

function findRootFolderId(pages: PageRow[], title: string): string | null {
  return pages.find((p) => p.title === title && !p.parentId)?.id ?? null;
}

function findChildFolderId(
  pages: PageRow[],
  parentId: string,
  folderTitle: string,
): string | null {
  return pages.find((p) => p.parentId === parentId && p.title === folderTitle)?.id ?? null;
}

export async function resolveWorldCategoryRootId(
  campaignId: string,
  folderTitle: string,
): Promise<string | null> {
  const pages = await loadCampaignPages(campaignId);
  const worldId = findRootFolderId(pages, 'World');
  if (!worldId) return null;
  return findChildFolderId(pages, worldId, folderTitle);
}

export async function resolveGameCategoryRootId(
  campaignId: string,
  folderTitle: string,
): Promise<string | null> {
  const pages = await loadCampaignPages(campaignId);
  const gameId = findRootFolderId(pages, 'Game');
  if (!gameId) return null;
  return findChildFolderId(pages, gameId, folderTitle);
}

export async function resolveCharactersRootId(campaignId: string): Promise<string | null> {
  return resolveWorldCategoryRootId(campaignId, 'Characters');
}

export async function validateLoreNoteParentId(
  campaignId: string,
  loreParentId: string,
): Promise<void> {
  const pages = await loadCampaignPages(campaignId);
  const worldId = findRootFolderId(pages, 'World');
  if (!worldId) {
    throw new Error('World folder not found in this campaign.');
  }

  const parent = pages.find((p) => p.id === loreParentId);
  if (!parent) {
    throw new Error('Lore folder not found.');
  }
  if (parent.parentId !== worldId) {
    throw new Error('Lore notes must be placed under a World lore folder.');
  }
  if (
    !(LORE_NOTE_FOLDER_TITLES as readonly string[]).includes(parent.title) ||
    isWorkshopDraftMetadata(parent.metadata) ||
    isWorkshopDraftsRootMetadata(parent.metadata)
  ) {
    throw new Error('Invalid lore folder for a lore note.');
  }
}

async function resolveSystemCategoryParentId(
  campaignId: string,
  target: WorkshopFormalizeTarget,
): Promise<string> {
  switch (target) {
    case 'quest': {
      const id = await ensureQuestsSystemCategoryKey(campaignId);
      if (!id) throw new Error('Quests category is not available in this campaign.');
      return id;
    }
    case 'thread': {
      const id = await ensureNarrativeThreadsSystemCategoryKey(campaignId);
      if (!id) throw new Error('Narrative Threads category is not available.');
      return id;
    }
    case 'scene': {
      const id = await ensureNarrativeScenesSystemCategoryKey(campaignId);
      if (!id) throw new Error('Scenes category is not available in this campaign.');
      return id;
    }
    default:
      throw new Error('Unsupported system formalize target.');
  }
}

export async function resolveFormalizeParentId(
  campaignId: string,
  target: WorkshopFormalizeTarget,
  loreParentId?: string | null,
): Promise<string> {
  if (target === 'lore_note') {
    if (!loreParentId?.trim()) {
      throw new Error('Select a lore folder for this note.');
    }
    await validateLoreNoteParentId(campaignId, loreParentId.trim());
    return loreParentId.trim();
  }

  const def = getWorkshopFormalizeTargetDef(target);

  if (def.parentRoot === 'system') {
    return resolveSystemCategoryParentId(campaignId, target);
  }

  if (!def.parentFolderTitle) {
    throw new Error('Unsupported formalize target.');
  }

  const id =
    def.parentRoot === 'world'
      ? await resolveWorldCategoryRootId(campaignId, def.parentFolderTitle)
      : await resolveGameCategoryRootId(campaignId, def.parentFolderTitle);

  if (!id) {
    throw new Error(`${def.parentFolderTitle} folder not found in this campaign.`);
  }
  return id;
}
