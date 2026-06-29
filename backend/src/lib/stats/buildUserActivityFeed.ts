import { prisma } from '../prisma.js';
import { NarrativeEventType } from '../narrativeEventService.js';
import type {
  LinkableCampaign,
  UserActivityItem,
  UserActivityResponse,
} from '../../../../shared/statsTypes.js';
import { resolveLinkableCampaigns } from './resolveLinkableCampaigns.js';
import {
  campaignActivityToFeedLine,
  narrativeEventToFeedLine,
} from './userActivityCopy.js';

const NARRATIVE_FEED_TYPES = [
  NarrativeEventType.PAGE_CREATED,
  NarrativeEventType.PAGE_EDITED,
  NarrativeEventType.LINK_CREATED,
  NarrativeEventType.STUB_RESOLVED,
] as const;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type FeedCandidate = {
  sortKey: string;
  item: UserActivityItem;
};

function linkableByCampaignId(
  campaigns: LinkableCampaign[],
): Map<string, LinkableCampaign> {
  return new Map(campaigns.map((c) => [c.id, c]));
}

export async function buildUserActivityFeed(input: {
  profileUserId: string;
  viewerUserId?: string | null;
  limit?: number;
  before?: string | null;
}): Promise<UserActivityResponse> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));
  const beforeDate = input.before ? new Date(input.before) : null;
  if (beforeDate && Number.isNaN(beforeDate.getTime())) {
    return { items: [], hasMore: false };
  }

  const linkableCampaigns = await resolveLinkableCampaigns(
    input.profileUserId,
    input.viewerUserId,
  );
  const linkableIds = linkableCampaigns.map((c) => c.id);
  if (linkableIds.length === 0) {
    return { items: [], hasMore: false };
  }

  const linkableMap = linkableByCampaignId(linkableCampaigns);
  const createdBefore = beforeDate ?? new Date();

  const [narrativeRows, activityRows] = await Promise.all([
    prisma.narrativeEvent.findMany({
      where: {
        campaignId: { in: linkableIds },
        actorUserId: input.profileUserId,
        source: 'user',
        type: { in: [...NARRATIVE_FEED_TYPES] },
        createdAt: { lt: createdBefore },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        type: true,
        pageId: true,
        targetPageId: true,
        metadata: true,
        createdAt: true,
        campaignId: true,
      },
    }),
    prisma.campaignActivity.findMany({
      where: {
        campaignId: { in: linkableIds },
        userId: input.profileUserId,
        entityType: { not: 'WIKI_PAGE' },
        createdAt: { lt: createdBefore },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        actionType: true,
        entityType: true,
        entityId: true,
        entityName: true,
        parentContext: true,
        createdAt: true,
        campaignId: true,
      },
    }),
  ]);

  const pageIds = new Set<string>();
  for (const row of narrativeRows) {
    if (row.pageId) pageIds.add(row.pageId);
    if (row.targetPageId) pageIds.add(row.targetPageId);
  }

  const pages =
    pageIds.size > 0
      ? await prisma.wikiPage.findMany({
          where: { id: { in: [...pageIds] } },
          select: { id: true, title: true },
        })
      : [];
  const pageTitles = new Map(pages.map((p) => [p.id, p.title]));

  const candidates: FeedCandidate[] = [];

  for (const row of narrativeRows) {
    const campaign = linkableMap.get(row.campaignId);
    if (!campaign) continue;
    const { line, href, wordDelta } = narrativeEventToFeedLine(
      row,
      { handle: campaign.handle, name: campaign.name },
      pageTitles,
    );
    candidates.push({
      sortKey: `${row.createdAt.toISOString()}:${row.id}`,
      item: {
        id: `ne:${row.id}`,
        source: 'narrative_event',
        type: row.type,
        createdAt: row.createdAt.toISOString(),
        campaign,
        line,
        href,
        ...(wordDelta != null ? { metadata: { wordDelta } } : {}),
      },
    });
  }

  for (const row of activityRows) {
    const campaign = linkableMap.get(row.campaignId);
    if (!campaign) continue;
    const { line, href } = campaignActivityToFeedLine(row, {
      handle: campaign.handle,
      name: campaign.name,
    });
    candidates.push({
      sortKey: `${row.createdAt.toISOString()}:${row.id}`,
      item: {
        id: `ca:${row.id}`,
        source: 'campaign_activity',
        type: row.entityType,
        createdAt: row.createdAt.toISOString(),
        campaign,
        line,
        href,
      },
    });
  }

  candidates.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));

  const hasMore = candidates.length > limit;
  const items = candidates.slice(0, limit).map((c) => c.item);

  return { items, hasMore };
}
