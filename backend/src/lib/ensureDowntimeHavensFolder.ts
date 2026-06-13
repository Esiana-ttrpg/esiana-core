import type { Prisma } from '@prisma/client';
import { WikiVisibility } from '../types/domain.js';
import { prisma } from './prisma.js';
import { ensureDowntimeSystemCategoryKey } from './ensureDowntimeSystemCategoryKey.js';

export const DOWNTIME_HAVENS_FOLDER_TITLE = 'Havens';

/**
 * Idempotently ensures the Havens folder exists under the Downtime category.
 */
export async function ensureDowntimeHavensFolder(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  const downtimeRootId = await ensureDowntimeSystemCategoryKey(campaignId, db);
  if (!downtimeRootId) return null;

  const existing = await db.wikiPage.findFirst({
    where: {
      campaignId,
      parentId: downtimeRootId,
      title: DOWNTIME_HAVENS_FOLDER_TITLE,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.wikiPage.create({
    data: {
      campaignId,
      title: DOWNTIME_HAVENS_FOLDER_TITLE,
      parentId: downtimeRootId,
      visibility: WikiVisibility.PARTY,
    },
    select: { id: true },
  });

  return created.id;
}
