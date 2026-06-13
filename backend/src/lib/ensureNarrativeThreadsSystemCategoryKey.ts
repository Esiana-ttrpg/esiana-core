import type { Prisma } from '@prisma/client';
import { WikiVisibility } from '../types/domain.js';
import { prisma } from './prisma.js';
import {
  buildNarrativeThreadsCategoryMetadata,
  isNarrativeThreadsCategoryPage,
  resolveNarrativeThreadsCategoryPage,
} from './wikiSystemCategory.js';

export const NARRATIVE_THREADS_CATEGORY_TITLE = 'Narrative Threads';

function mergeMetadataWithThreadsKey(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...buildNarrativeThreadsCategoryMetadata() };
}

function resolveGameFolderPage(
  pages: Array<{ id: string; title: string; parentId: string | null }>,
): { id: string } | null {
  const gameFolder = pages.find((page) => page.title === 'Game' && !page.parentId);
  return gameFolder ?? null;
}

/**
 * Idempotently ensures the Narrative Threads category exists under Game and stamps
 * systemCategoryKey. Returns the threads category page id.
 */
export async function ensureNarrativeThreadsSystemCategoryKey(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const existing = resolveNarrativeThreadsCategoryPage(pages);
  if (existing) {
    if (!isNarrativeThreadsCategoryPage(existing.metadata)) {
      await db.wikiPage.update({
        where: { id: existing.id },
        data: {
          metadata: mergeMetadataWithThreadsKey(existing.metadata) as never,
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
      title: NARRATIVE_THREADS_CATEGORY_TITLE,
      parentId: gameFolder.id,
      visibility: WikiVisibility.PARTY,
      metadata: buildNarrativeThreadsCategoryMetadata() as never,
    },
    select: { id: true },
  });

  return created.id;
}
