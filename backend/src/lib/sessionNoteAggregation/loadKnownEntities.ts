import { prisma } from '../prisma.js';
import { normalizeCampaignMemberRole } from '../acl.js';
import {
  CampaignMemberRoles,
  WikiVisibility,
} from '../../types/domain.js';
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

function isManagerRole(role: ReturnType<typeof normalizeCampaignMemberRole>): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  );
}

function visibilityWhereForRole(
  role: ReturnType<typeof normalizeCampaignMemberRole>,
): { visibility?: { in: string[] } } {
  if (isManagerRole(role)) return {};
  if (
    role === CampaignMemberRoles.PARTICIPANT ||
    role === CampaignMemberRoles.OBSERVER
  ) {
    return {
      visibility: { in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY] },
    };
  }
  return { visibility: { in: [WikiVisibility.PUBLIC] } };
}

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
      ...visibilityWhereForRole(role),
    },
    select: {
      id: true,
      title: true,
      visibility: true,
      templateType: true,
    },
    orderBy: { title: 'asc' },
    take: MAX_ENTITY_PAGES,
  });

  if (pages.length === 0) return [];

  const aliases = await prisma.wikiPageAlias.findMany({
    where: {
      campaignId: input.campaignId,
      pageId: { in: pages.map((p) => p.id) },
    },
    select: { pageId: true, alias: true },
  });

  const aliasesByPage = new Map<string, string[]>();
  for (const row of aliases) {
    const list = aliasesByPage.get(row.pageId) ?? [];
    list.push(row.alias);
    aliasesByPage.set(row.pageId, list);
  }

  return pages.map((page) => ({
    pageId: page.id,
    title: page.title,
    aliases: aliasesByPage.get(page.id) ?? [],
  }));
}
