import type { Prisma } from './prismaClient.js';
import { WikiVisibility } from '../types/domain.js';
import { prisma } from './prisma.js';
import {
  buildNarrativeScenesCategoryMetadata,
  isNarrativeScenesCategoryPage,
  resolveNarrativeScenesCategoryPage,
} from './wikiSystemCategory.js';

export const NARRATIVE_SCENES_CATEGORY_TITLE = 'Scenes';
const pendingSceneRoots = new Map<string, Promise<string | null>>();

function mergeMetadataWithScenesKey(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...buildNarrativeScenesCategoryMetadata() };
}

function resolveGameFolderPage(
  pages: Array<{ id: string; title: string; parentId: string | null }>,
): { id: string } | null {
  const gameFolder = pages.find((page) => page.title === 'Game' && !page.parentId);
  return gameFolder ?? null;
}

export async function ensureNarrativeScenesSystemCategoryKey(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  if (db !== prisma) return resolveOrCreateScenesCategory(campaignId, db);
  const pending = pendingSceneRoots.get(campaignId);
  if (pending) return pending;
  const resolving = (async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(tx => resolveOrCreateScenesCategory(campaignId, tx),
          { isolationLevel: 'Serializable' });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (attempt === 2 || (code !== 'P2034' && code !== 'P2002')) throw error;
      }
    }
    return null;
  })();
  pendingSceneRoots.set(campaignId, resolving);
  try {
    return await resolving;
  } finally {
    if (pendingSceneRoots.get(campaignId) === resolving) pendingSceneRoots.delete(campaignId);
  }
}

async function resolveOrCreateScenesCategory(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<string | null> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const existing = resolveNarrativeScenesCategoryPage(pages);
  if (existing) {
    if (!isNarrativeScenesCategoryPage(existing.metadata)) {
      await db.wikiPage.update({
        where: { id: existing.id },
        data: {
          metadata: mergeMetadataWithScenesKey(existing.metadata) as never,
        },
      });
    }
    return existing.id;
  }

  const gameFolder = resolveGameFolderPage(pages);
  if (!gameFolder) return null;

  const created = await db.wikiPage.create({
    data: {
      campaignId,
      title: NARRATIVE_SCENES_CATEGORY_TITLE,
      parentId: gameFolder.id,
      visibility: WikiVisibility.DM_ONLY,
      metadata: buildNarrativeScenesCategoryMetadata() as never,
    },
    select: { id: true },
  });

  return created.id;
}
