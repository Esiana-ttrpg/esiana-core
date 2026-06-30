import { prisma } from './prisma.js';
import { canViewWikiPage } from './wikiTree.js';
import { campaignWikiHref } from './dashboardPaths.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { buildCategoryIndexWhereClause } from './wikiCategoryEntityIndex.js';
import { isReservedSystemWikiPage } from './wikiSystemPages.js';
import { ENTITY_CATEGORY_DISPLAY_BY_KEY } from './entityCategoryKeys.js';
import {
  buildWikiIndexSubtitle,
  resolveCategoryTitleForPage,
} from '../../../shared/wikiIndexSubtitle.js';
import {
  normalizeRecentEntitiesConfig,
  type DashboardRecentEntityCategory,
} from '../../../shared/dashboardRecentEntitiesCatalog.js';
import type { CampaignMemberRole } from '../types/domain.js';

export type RecentEntitiesFeedItem = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  timestamp: string;
  categoryKey: string | null;
  templateType: string;
};

export type RecentEntitiesFeedResult = {
  items: RecentEntitiesFeedItem[];
};

const FETCH_BUFFER = 40;

function categoryTitleForKey(category: DashboardRecentEntityCategory): string | null {
  if (category === 'all') return null;
  return ENTITY_CATEGORY_DISPLAY_BY_KEY[category] ?? null;
}

export async function buildRecentEntitiesFeed(input: {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  config?: Record<string, unknown>;
}): Promise<RecentEntitiesFeedResult> {
  const { campaignId, campaignHandle, role } = input;
  const { category, limit, sortBy } = normalizeRecentEntitiesConfig(input.config);

  const categoryTitle = categoryTitleForKey(category);
  const where = categoryTitle
    ? { campaignId, deletedAt: null, ...buildCategoryIndexWhereClause(categoryTitle) }
    : { campaignId, deletedAt: null };

  const orderBy =
    sortBy === 'alphabetical'
      ? ([{ title: 'asc' }, { id: 'asc' }] as const)
      : sortBy === 'created'
        ? ([{ createdAt: 'desc' }, { id: 'asc' }] as const)
        : ([{ updatedAt: 'desc' }, { id: 'asc' }] as const);

  const rows = await prisma.wikiPage.findMany({
    where,
    select: {
      ...wikiPageHrefSelect,
      visibility: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [...orderBy],
    take: FETCH_BUFFER,
  });

  const items: RecentEntitiesFeedItem[] = [];
  for (const row of rows) {
    if (!canViewWikiPage(row.visibility, role)) continue;
    if (isReservedSystemWikiPage({ title: row.title, templateType: row.templateType })) {
      continue;
    }
    const pageCategoryTitle = resolveCategoryTitleForPage(row.metadata, category === 'all' ? null : category);
    const subtitle = buildWikiIndexSubtitle(row.metadata, pageCategoryTitle);
    const timestamp =
      sortBy === 'created' ? row.createdAt.toISOString() : row.updatedAt.toISOString();

    items.push({
      id: row.id,
      title: row.title,
      subtitle,
      href: campaignWikiHref(campaignHandle, row),
      timestamp,
      categoryKey: category === 'all' ? null : category,
      templateType: row.templateType,
    });
    if (items.length >= limit) break;
  }

  return { items };
}
