import type { Prisma } from '@prisma/client';
import { WikiVisibility } from '../types/domain.js';
import { prisma } from './prisma.js';
import {
  buildDowntimeCategoryMetadata,
  isDowntimeCategoryPage,
  resolveDowntimeCategoryPage,
} from './wikiSystemCategory.js';

export const DOWNTIME_CATEGORY_TITLE = 'Downtime';

function mergeMetadataWithDowntimeKey(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...buildDowntimeCategoryMetadata() };
}

function resolveGameFolderPage(
  pages: Array<{ id: string; title: string; parentId: string | null }>,
): { id: string } | null {
  const gameFolder = pages.find((page) => page.title === 'Game' && !page.parentId);
  return gameFolder ?? null;
}

/**
 * Idempotently ensures the Downtime category exists under Game and stamps
 * systemCategoryKey. Returns the downtime category page id.
 */
export async function ensureDowntimeSystemCategoryKey(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const existing = resolveDowntimeCategoryPage(pages);
  if (existing) {
    if (!isDowntimeCategoryPage(existing.metadata)) {
      await db.wikiPage.update({
        where: { id: existing.id },
        data: {
          metadata: mergeMetadataWithDowntimeKey(existing.metadata) as never,
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
      title: DOWNTIME_CATEGORY_TITLE,
      parentId: gameFolder.id,
      visibility: WikiVisibility.PARTY,
      metadata: buildDowntimeCategoryMetadata() as never,
    },
    select: { id: true },
  });

  return created.id;
}
