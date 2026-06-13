import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { normalizeAlias } from './normalizeAlias.js';

const LEGACY_DASHBOARD_TITLE = 'Dashboard';
const WORLD_TITLE = 'World';

async function ensureDashboardAlias(
  campaignId: string,
  pageId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const normalizedAlias = normalizeAlias(LEGACY_DASHBOARD_TITLE);
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
      alias: LEGACY_DASHBOARD_TITLE,
      normalizedAlias,
    },
  });
}

/**
 * Idempotently soft-deletes the legacy seeded Dashboard wiki page and preserves
 * "Dashboard" as a wikilink alias on the World page.
 */
export async function ensureRemoveLegacyDashboardWikiPage(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true },
  });

  const dashboard = pages.find(
    (page) => page.title === LEGACY_DASHBOARD_TITLE && page.parentId === null,
  );
  if (!dashboard) return;

  const world = pages.find(
    (page) => page.title === WORLD_TITLE && page.parentId === null,
  );

  await db.wikiPage.update({
    where: { id: dashboard.id },
    data: { deletedAt: new Date() },
  });

  if (world) {
    await ensureDashboardAlias(campaignId, world.id, db);
  }
}
