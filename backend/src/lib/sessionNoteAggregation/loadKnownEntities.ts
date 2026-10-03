import { prisma } from '../prisma.js';
import { canViewWikiPage } from '../wikiTree.js';
import { normalizeCampaignMemberRole } from '../acl.js';
import type { AggregateKnownEntity } from './types.js';

const LINKABLE_TEMPLATE_TYPES = [
  'CHARACTER',
  'LOCATION',
  'ORGANIZATION',
  'OBJECT',
  'BESTIARY',
  'FAMILY',
  'ANCESTRY',
  'DEFAULT',
  'QUEST',
  'RULE',
] as const;

const MAX_ENTITY_PAGES = 400;

/**
 * Viewer-scoped entity dictionary for session-note aggregation matching.
 * Excludes session notes; titles + aliases only.
 */
export async function loadKnownEntitiesForAggregation(input: {
  campaignId: string;
  role: string | null;
}): Promise<AggregateKnownEntity[]> {
  const role = normalizeCampaignMemberRole(input.role);
  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId: input.campaignId,
      deletedAt: null,
      templateType: { in: [...LINKABLE_TEMPLATE_TYPES] },
    },
    select: {
      id: true,
      title: true,
      visibility: true,
      templateType: true,
    },
    orderBy: { title: 'asc' },
    take: MAX_ENTITY_PAGES + 50,
  });

  const visible = pages
    .filter((page) => canViewWikiPage(page.visibility, role))
    .slice(0, MAX_ENTITY_PAGES);

  if (visible.length === 0) return [];

  const aliases = await prisma.wikiPageAlias.findMany({
    where: {
      campaignId: input.campaignId,
      pageId: { in: visible.map((p) => p.id) },
    },
    select: { pageId: true, alias: true },
  });

  const aliasesByPage = new Map<string, string[]>();
  for (const row of aliases) {
    const list = aliasesByPage.get(row.pageId) ?? [];
    list.push(row.alias);
    aliasesByPage.set(row.pageId, list);
  }

  return visible.map((page) => ({
    pageId: page.id,
    title: page.title,
    aliases: aliasesByPage.get(page.id) ?? [],
  }));
}
