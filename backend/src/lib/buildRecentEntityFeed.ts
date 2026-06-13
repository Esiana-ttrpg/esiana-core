import { prisma } from './prisma.js';
import { canViewWikiPage } from './wikiTree.js';
import { campaignWikiHref } from './dashboardPaths.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { campaignNotePath } from './notifications/deepLinks.js';
import { formatEditorialFreshness } from './editorialFreshness.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { SessionScheduleStatus } from './notifications/types.js';
import type {
  RecentEntityFeedItem,
  RecentEntityFeedOptions,
  RecentEntityFeedResult,
  RecentEntityType,
} from './recentEntityFeedTypes.js';

const DEFAULT_LIMIT = 12;
const WIKI_FETCH_BUFFER = 20;

function normalizeVisibility(visibility: string): 'PUBLIC' | 'PARTY' | 'DM_ONLY' | null {
  if (visibility === 'Public') return 'PUBLIC';
  if (visibility === 'Party') return 'PARTY';
  if (visibility === 'DM_Only') return 'DM_ONLY';
  return null;
}

function wantsType(types: RecentEntityType[] | undefined, type: RecentEntityType): boolean {
  return !types || types.length === 0 || types.includes(type);
}

async function fetchWikiFeedItems(
  campaignId: string,
  role: CampaignMemberRole | null,
  campaignHandle: string,
  limit: number,
): Promise<RecentEntityFeedItem[]> {
  const rows = await prisma.wikiPage.findMany({
    where: { campaignId },
    select: {
      ...wikiPageHrefSelect,
      visibility: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: WIKI_FETCH_BUFFER,
  });

  const items: RecentEntityFeedItem[] = [];
  for (const row of rows) {
    if (!canViewWikiPage(row.visibility, role)) continue;
    const updatedAt = row.updatedAt;
    items.push({
      entityType: 'WIKI_PAGE',
      entityId: row.id,
      title: row.title,
      href: campaignWikiHref(campaignHandle, row),
      updatedAt: updatedAt.toISOString(),
      visibility: normalizeVisibility(row.visibility),
      freshnessLabel: formatEditorialFreshness(updatedAt),
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchQuestFeedItems(
  campaignId: string,
  role: CampaignMemberRole | null,
  campaignHandle: string,
  limit: number,
): Promise<RecentEntityFeedItem[]> {
  const { buildDashboardQuestLedgerEntries } = await import('./dashboardQuestLedger.js');
  const quests = await buildDashboardQuestLedgerEntries(campaignId, role, {
    limit: Math.min(limit, 8),
  });
  return quests.map((q) => ({
    entityType: 'QUEST' as const,
    entityId: q.id,
    title: q.title,
    href: campaignWikiHref(campaignHandle, {
      id: q.id,
      title: q.title,
      parentId: q.parentId,
      templateType: q.templateType,
      workspace: q.workspace,
      pathKey: q.pathKey,
      metadata: q.metadata,
    }),
    updatedAt: q.updatedAt,
    summary: q.snippet || null,
    freshnessLabel: formatEditorialFreshness(new Date(q.updatedAt)),
  }));
}

async function fetchSessionFeedItems(
  campaignId: string,
  campaignHandle: string,
  limit: number,
): Promise<RecentEntityFeedItem[]> {
  const now = new Date();
  const [nextRow, pastRow] = await Promise.all([
    prisma.campaignSessionSchedule.findFirst({
      where: {
        status: SessionScheduleStatus.PUBLISHED,
        plannedStartAt: { gte: now },
        timelinePoint: { campaignId },
      },
      orderBy: [{ plannedStartAt: 'asc' }, { timelinePointId: 'asc' }],
      include: {
        timelinePoint: { include: { wikiPage: { select: { title: true } } } },
      },
    }),
    prisma.campaignSessionSchedule.findFirst({
      where: {
        status: SessionScheduleStatus.PUBLISHED,
        plannedStartAt: { lt: now },
        timelinePoint: { campaignId },
      },
      orderBy: [{ plannedStartAt: 'desc' }, { timelinePointId: 'asc' }],
      include: {
        timelinePoint: { include: { wikiPage: { select: { title: true } } } },
      },
    }),
  ]);

  const items: RecentEntityFeedItem[] = [];

  if (nextRow) {
    const updatedAt = nextRow.plannedStartAt ?? nextRow.publishedAt ?? new Date();
    items.push({
      entityType: 'SESSION',
      entityId: nextRow.timelinePointId,
      title: nextRow.timelinePoint.wikiPage.title,
      href: campaignNotePath(campaignHandle, nextRow.timelinePointId),
      updatedAt: updatedAt.toISOString(),
      reason: 'Next session',
      importance: 'SESSION_RELEVANT',
      freshnessLabel: 'Upcoming',
    });
  }

  if (pastRow && items.length < limit) {
    const updatedAt = pastRow.plannedStartAt ?? pastRow.publishedAt ?? new Date();
    items.push({
      entityType: 'SESSION',
      entityId: pastRow.timelinePointId,
      title: pastRow.timelinePoint.wikiPage.title,
      href: campaignNotePath(campaignHandle, pastRow.timelinePointId),
      updatedAt: updatedAt.toISOString(),
      reason: 'Last session',
      importance: 'SESSION_RELEVANT',
      freshnessLabel: formatEditorialFreshness(updatedAt),
    });
  }

  return items.slice(0, limit);
}

async function fetchCalendarEventFeedItems(
  campaignId: string,
  campaignHandle: string,
  limit: number,
): Promise<RecentEntityFeedItem[]> {
  const master = await prisma.fantasyCalendar.findFirst({
    where: { campaignId, isMasterTime: true },
    select: { id: true },
  });
  if (!master) return [];

  const events = await prisma.calendarEvent.findMany({
    where: { calendarId: master.id },
    select: { id: true, title: true, updatedAt: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: limit,
  });

  return events.map((event) => ({
    entityType: 'CALENDAR_EVENT' as const,
    entityId: event.id,
    title: event.title,
    href: `/campaigns/${campaignHandle}/chronology?view=events`,
    updatedAt: event.updatedAt.toISOString(),
    freshnessLabel: formatEditorialFreshness(event.updatedAt),
  }));
}

export async function buildRecentEntityFeed(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  _viewerUserId: string | null,
  options?: RecentEntityFeedOptions,
): Promise<RecentEntityFeedResult> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const types = options?.entityTypes;

  const buckets: RecentEntityFeedItem[] = [];

  if (wantsType(types, 'WIKI_PAGE')) {
    buckets.push(...(await fetchWikiFeedItems(campaignId, role, campaignHandle, limit)));
  }
  if (wantsType(types, 'QUEST')) {
    buckets.push(...(await fetchQuestFeedItems(campaignId, role, campaignHandle, limit)));
  }
  if (wantsType(types, 'SESSION')) {
    buckets.push(...(await fetchSessionFeedItems(campaignId, campaignHandle, limit)));
  }
  if (wantsType(types, 'CALENDAR_EVENT')) {
    buckets.push(...(await fetchCalendarEventFeedItems(campaignId, campaignHandle, limit)));
  }

  const sorted = buckets.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return { items: sorted.slice(0, limit) };
}

export async function buildRecentLoreFeed(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  limit = 3,
): Promise<RecentEntityFeedResult> {
  return buildRecentEntityFeed(campaignId, campaignHandle, role, null, {
    entityTypes: ['WIKI_PAGE'],
    limit,
  });
}
