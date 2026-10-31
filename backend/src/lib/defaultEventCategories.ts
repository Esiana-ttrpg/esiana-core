import type { Prisma } from './prismaClient.js';
import { prisma } from './prisma.js';
import { DEFAULT_EVENT_CATEGORIES } from '../../../shared/defaultEventCategories.js';

/** Must run within a transaction: the claim and inserts commit or roll back together. */
export async function initializeEventCategories(
  tx: Prisma.TransactionClient,
  campaignId: string,
  options: { newCampaign?: boolean } = {},
) {
  const claim = await tx.campaign.updateMany({
    where: { id: campaignId, eventCategoriesInitialized: false },
    data: { eventCategoriesInitialized: true },
  });
  if (!claim.count) return;
  const existing = await tx.calendarEventCategory.findMany({ where: { campaignId } });
  const names = new Set(existing.map(category => category.name.trim().toLowerCase()));
  let sortOrder = existing.length ? Math.max(...existing.map(category => category.sortOrder)) + 1 : 0;
  for (const category of DEFAULT_EVENT_CATEGORIES) {
    if (names.has(category.name.toLowerCase())) continue;
    // Personal was seeded before initialization was tracked. Its absence in an
    // existing campaign may be an intentional deletion or rename; preserve that.
    if (!options.newCampaign && category.name === 'Personal') continue;
    await tx.calendarEventCategory.create({ data: { campaignId, ...category, sortOrder: sortOrder++ } });
  }
}

/** One-time portable backfill before serving requests; never runs on category reads. */
export async function initializeExistingEventCategories() {
  for (;;) {
    const campaigns = await prisma.campaign.findMany({
      where: { eventCategoriesInitialized: false }, select: { id: true }, take: 100,
    });
    if (!campaigns.length) return;
    for (const campaign of campaigns) {
      await prisma.$transaction(tx => initializeEventCategories(tx, campaign.id));
    }
  }
}
