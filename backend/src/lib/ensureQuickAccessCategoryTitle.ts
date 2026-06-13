import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { normalizeAlias } from './normalizeAlias.js';

const LEGACY_BOOKMARKS_TITLE = 'Bookmarks';
const QUICK_ACCESS_TITLE = 'Quick Access';

async function ensureBookmarksAlias(
  campaignId: string,
  pageId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const normalizedAlias = normalizeAlias(LEGACY_BOOKMARKS_TITLE);
  const existing = await db.wikiPageAlias.findUnique({
    where: {
      campaignId_normalizedAlias: { campaignId, normalizedAlias },
    },
  });
  if (existing) return;

  await db.wikiPageAlias.create({
    data: {
      campaignId,
      pageId,
      alias: LEGACY_BOOKMARKS_TITLE,
      normalizedAlias,
    },
  });
}

/**
 * Idempotently renames the seeded Bookmarks category folder to Quick Access
 * and preserves "Bookmarks" as a wikilink alias.
 */
export async function ensureQuickAccessCategoryTitle(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true },
  });

  const quickAccess = pages.find((page) => page.title === QUICK_ACCESS_TITLE);
  if (quickAccess) {
    await ensureBookmarksAlias(campaignId, quickAccess.id, db);
    return quickAccess.id;
  }

  const bookmarks = pages.find((page) => page.title === LEGACY_BOOKMARKS_TITLE);
  if (!bookmarks) return null;

  await db.wikiPage.update({
    where: { id: bookmarks.id },
    data: { title: QUICK_ACCESS_TITLE },
  });
  await ensureBookmarksAlias(campaignId, bookmarks.id, db);
  return bookmarks.id;
}
