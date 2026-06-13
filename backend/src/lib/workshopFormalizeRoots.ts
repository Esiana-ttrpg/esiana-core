import type { WorkshopFormalizeTarget } from '../../../shared/workshopDocument.js';
import {
  isWorkshopDraftMetadata,
  isWorkshopDraftsRootMetadata,
} from '../../../shared/workshopDocument.js';
import { LORE_NOTE_FOLDER_TITLES } from '../../../shared/workshopFormalize.js';
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

function findWorldFolderId(pages: PageRow[]): string | null {
  return pages.find((p) => p.title === 'World' && !p.parentId)?.id ?? null;
}

export async function resolveCharactersRootId(campaignId: string): Promise<string | null> {
  const pages = await loadCampaignPages(campaignId);
  const worldId = findWorldFolderId(pages);
  if (!worldId) return null;
  return pages.find((p) => p.parentId === worldId && p.title === 'Characters')?.id ?? null;
}

export async function validateLoreNoteParentId(
  campaignId: string,
  loreParentId: string,
): Promise<void> {
  const pages = await loadCampaignPages(campaignId);
  const worldId = findWorldFolderId(pages);
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
  if (parent.title === 'Journals') {
    throw new Error('Workshop drafts cannot be formalized into Journals.');
  }
}

export async function resolveFormalizeParentId(
  campaignId: string,
  target: WorkshopFormalizeTarget,
  loreParentId?: string | null,
): Promise<string> {
  switch (target) {
    case 'character': {
      const id = await resolveCharactersRootId(campaignId);
      if (!id) throw new Error('Characters folder not found under World.');
      return id;
    }
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
    case 'lore_note': {
      if (!loreParentId?.trim()) {
        throw new Error('Select a lore folder for this note.');
      }
      await validateLoreNoteParentId(campaignId, loreParentId.trim());
      return loreParentId.trim();
    }
    default:
      throw new Error('Unsupported formalize target.');
  }
}
