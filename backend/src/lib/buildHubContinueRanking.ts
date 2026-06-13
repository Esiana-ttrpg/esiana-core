import { prisma } from './prisma.js';
import { SessionScheduleStatus } from './notifications/types.js';
import { CampaignMemberRoles, JoinRequestStatus } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  fetchLastDashboardSession,
  fetchNextDashboardSession,
  type DashboardSessionSummary,
} from './buildDashboardSessions.js';
import { buildContinueWhereYouLeftOff } from './buildContinueWhereYouLeftOff.js';
import {
  campaignDashboardPath,
  campaignNotePath,
  campaignSettingsPath,
} from './notifications/deepLinks.js';

export type HubPendingAction = {
  type: string;
  label: string;
  href: string;
};

export type HubCampaignSignals = {
  lastActivityAt: string | null;
  unreadCount: number;
  nextSession: {
    title: string;
    plannedStartAt: string;
    timelinePointId: string;
  } | null;
  pendingActions: HubPendingAction[];
  continueScore: number;
};

export type HubContinueCandidate = {
  campaignId: string;
  handle: string;
  name: string;
  heroImageUrl: string | null;
  role: CampaignMemberRole;
  continueScore: number;
  continueReason: string;
  continueCta: { label: string; href: string };
  signals: HubCampaignSignals;
};

export type HubContinueEntityItem = {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  entityType: 'WIKI_PAGE' | 'SESSION';
  entityId: string;
  title: string;
  href: string;
  reason: string;
  updatedAt?: string;
  score: number;
};

type MembershipRow = {
  campaignId: string;
  role: CampaignMemberRole;
  campaign: {
    id: string;
    handle: string;
    name: string;
    updatedAt: Date;
  };
};

function isDmRole(role: CampaignMemberRole): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function hoursUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getTime() - Date.now()) / 3_600_000;
}

function formatSessionReason(plannedStartAt: string): string {
  const hours = hoursUntil(plannedStartAt);
  if (hours == null) return 'Upcoming session';
  if (hours <= 0) return 'Session today';
  if (hours <= 24) return 'Session tomorrow';
  if (hours <= 48) return 'Session in 2 days';
  const date = new Date(plannedStartAt);
  return `Session ${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

function buildContinueReason(input: {
  unreadCount: number;
  nextSession: DashboardSessionSummary | null;
  pendingActions: HubPendingAction[];
  lastActivityAt: string | null;
}): string {
  if (input.pendingActions.some((a) => a.type === 'RSVP')) {
    return 'RSVP needed';
  }
  if (input.pendingActions.some((a) => a.type === 'JOIN_REQUEST')) {
    const count = input.pendingActions.filter((a) => a.type === 'JOIN_REQUEST').length;
    return count === 1 ? '1 join request pending' : `${count} join requests pending`;
  }
  if (input.unreadCount > 0) {
    return input.unreadCount === 1 ? '1 unread update' : `${input.unreadCount} unread updates`;
  }
  if (input.nextSession?.plannedStartAt) {
    return formatSessionReason(input.nextSession.plannedStartAt);
  }
  if (input.lastActivityAt) {
    const hours = hoursUntil(input.lastActivityAt);
    if (hours != null && hours < 24) return 'Active today';
    if (hours != null && hours < 24 * 7) return 'Updated this week';
  }
  return 'Pick up where you left off';
}

function buildContinueCta(
  handle: string,
  role: CampaignMemberRole,
  nextSession: DashboardSessionSummary | null,
  pendingActions: HubPendingAction[],
): { label: string; href: string } {
  const rsvp = pendingActions.find((a) => a.type === 'RSVP');
  if (rsvp) return { label: 'RSVP Now', href: rsvp.href };
  if (nextSession) {
    return {
      label: isDmRole(role) ? 'Continue Prep' : 'Resume Session',
      href: campaignNotePath(handle, nextSession.timelinePointId),
    };
  }
  return {
    label: isDmRole(role) ? 'Continue Prep' : 'Open Campaign',
    href: campaignDashboardPath(handle),
  };
}

function scoreCampaign(input: {
  unreadCount: number;
  nextSession: DashboardSessionSummary | null;
  pendingRsvp: boolean;
  pendingJoinRequests: number;
  lastActivityAt: string | null;
  role: CampaignMemberRole;
}): number {
  let score = 0;
  const sessionHours = hoursUntil(input.nextSession?.plannedStartAt ?? null);
  if (sessionHours != null && sessionHours >= 0) {
    if (sessionHours <= 48) score += 200;
    else if (sessionHours <= 24 * 7) score += 80;
  }
  score += Math.min(input.unreadCount * 100, 300);
  if (input.pendingRsvp) score += 150;
  score += input.pendingJoinRequests * 120;
  if (input.lastActivityAt) {
    const activityHours = hoursUntil(input.lastActivityAt);
    if (activityHours != null) {
      if (activityHours < 24) score += 60;
      else if (activityHours < 24 * 7) score += 30;
      else if (activityHours > 24 * 30) score -= 20;
    }
  }
  if (isDmRole(input.role)) score += 10;
  return score;
}

async function batchNextSessions(
  campaignIds: string[],
): Promise<Map<string, DashboardSessionSummary>> {
  const map = new Map<string, DashboardSessionSummary>();
  if (campaignIds.length === 0) return map;

  const now = new Date();
  const rows = await prisma.campaignSessionSchedule.findMany({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: now },
      timelinePoint: { campaignId: { in: campaignIds } },
    },
    orderBy: { plannedStartAt: 'asc' },
    include: {
      timelinePoint: {
        select: {
          id: true,
          campaignId: true,
          sequenceOrder: true,
          wikiPage: { select: { title: true } },
        },
      },
    },
  });

  for (const row of rows) {
    const campaignId = row.timelinePoint.campaignId;
    if (map.has(campaignId)) continue;
    map.set(campaignId, {
      timelinePointId: row.timelinePointId,
      title: row.timelinePoint.wikiPage.title,
      plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
      sequenceOrder: row.timelinePoint.sequenceOrder,
    });
  }
  return map;
}

async function batchLastActivity(
  campaignIds: string[],
): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (campaignIds.length === 0) return map;

  const [activities, wikiStats, campaigns] = await Promise.all([
    prisma.campaignActivity.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds } },
      _max: { createdAt: true },
    }),
    prisma.wikiPageStats.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds } },
      _max: { lastEditedAt: true },
    }),
    prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, updatedAt: true },
    }),
  ]);

  for (const campaign of campaigns) {
    map.set(campaign.id, campaign.updatedAt);
  }
  for (const row of activities) {
    const max = row._max.createdAt;
    if (!max) continue;
    const existing = map.get(row.campaignId);
    if (!existing || max > existing) map.set(row.campaignId, max);
  }
  for (const row of wikiStats) {
    const max = row._max.lastEditedAt;
    if (!max) continue;
    const existing = map.get(row.campaignId);
    if (!existing || max > existing) map.set(row.campaignId, max);
  }
  return map;
}

async function batchUnreadCounts(
  userId: string,
  campaignIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (campaignIds.length === 0) return map;

  const rows = await prisma.notification.groupBy({
    by: ['campaignId'],
    where: {
      userId,
      readAt: null,
      campaignId: { in: campaignIds },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    if (row.campaignId) map.set(row.campaignId, row._count._all);
  }
  return map;
}

async function batchPendingJoinRequests(
  managedCampaignIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (managedCampaignIds.length === 0) return map;

  const rows = await prisma.campaignJoinRequest.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: { in: managedCampaignIds },
      status: JoinRequestStatus.PENDING,
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    map.set(row.campaignId, row._count._all);
  }
  return map;
}

async function batchPendingRsvp(
  userId: string,
  nextSessions: Map<string, DashboardSessionSummary>,
): Promise<Set<string>> {
  const pending = new Set<string>();
  const timelinePointIds = [...nextSessions.values()]
    .map((s) => s.timelinePointId)
    .filter(Boolean);

  if (timelinePointIds.length === 0) return pending;

  const attendance = await prisma.sessionAttendance.findMany({
    where: {
      userId,
      timelinePointId: { in: timelinePointIds },
    },
    select: { timelinePointId: true },
  });
  const responded = new Set(attendance.map((a) => a.timelinePointId));

  for (const [campaignId, session] of nextSessions) {
    if (!responded.has(session.timelinePointId)) {
      pending.add(campaignId);
    }
  }
  return pending;
}

export function selectResumeHeroCandidates(
  ranked: HubContinueCandidate[],
  pinnedCampaignIds: string[],
  max = 4,
): HubContinueCandidate[] {
  const byId = new Map(ranked.map((c) => [c.campaignId, c]));
  const selected: HubContinueCandidate[] = [];
  const used = new Set<string>();

  for (const campaignId of pinnedCampaignIds) {
    const candidate = byId.get(campaignId);
    if (!candidate || used.has(campaignId)) continue;
    selected.push(candidate);
    used.add(campaignId);
    if (selected.length >= max) return selected;
  }

  for (const candidate of ranked) {
    if (used.has(candidate.campaignId)) continue;
    selected.push(candidate);
    used.add(candidate.campaignId);
    if (selected.length >= max) break;
  }

  return selected;
}

export async function buildHubContinueRanking(input: {
  userId: string;
  memberships: MembershipRow[];
  pinnedCampaignIds?: string[];
}): Promise<{
  continue: HubContinueCandidate[];
  resumeHero: HubContinueCandidate[];
  continueFeed: HubContinueEntityItem[];
  signalsByCampaignId: Map<string, HubCampaignSignals>;
}> {
  const memberRows = input.memberships.filter((m) => m.role != null);
  const campaignIds = memberRows.map((m) => m.campaignId);
  const managedIds = memberRows
    .filter((m) => isDmRole(m.role))
    .map((m) => m.campaignId);

  const [nextSessionsMap, lastActivity, unreadCounts, joinRequestCounts] =
    await Promise.all([
      batchNextSessions(campaignIds),
      batchLastActivity(campaignIds),
      batchUnreadCounts(input.userId, campaignIds),
      batchPendingJoinRequests(managedIds),
    ]);

  const pendingRsvpSet = await batchPendingRsvp(input.userId, nextSessionsMap);

  const signalsByCampaignId = new Map<string, HubCampaignSignals>();
  const ranked: HubContinueCandidate[] = [];

  for (const membership of memberRows) {
    const { campaignId, role, campaign } = membership;
    const nextSession = nextSessionsMap.get(campaignId) ?? null;
    const unreadCount = unreadCounts.get(campaignId) ?? 0;
    const joinPending = joinRequestCounts.get(campaignId) ?? 0;
    const needsRsvp = pendingRsvpSet.has(campaignId);
    const lastActivityDate = lastActivity.get(campaignId);
    const lastActivityAt = lastActivityDate?.toISOString() ?? null;

    const pendingActions: HubPendingAction[] = [];
    if (needsRsvp && nextSession) {
      pendingActions.push({
        type: 'RSVP',
        label: 'RSVP needed',
        href: campaignNotePath(campaign.handle, nextSession.timelinePointId),
      });
    }
    if (joinPending > 0) {
      pendingActions.push({
        type: 'JOIN_REQUEST',
        label: joinPending === 1 ? '1 join request' : `${joinPending} join requests`,
        href: campaignSettingsPath(campaign.handle, 'recruitment'),
      });
    }

    const continueScore = scoreCampaign({
      unreadCount,
      nextSession,
      pendingRsvp: needsRsvp,
      pendingJoinRequests: joinPending,
      lastActivityAt,
      role,
    });

    const signals: HubCampaignSignals = {
      lastActivityAt,
      unreadCount,
      nextSession: nextSession?.plannedStartAt
        ? {
            title: nextSession.title,
            plannedStartAt: nextSession.plannedStartAt,
            timelinePointId: nextSession.timelinePointId,
          }
        : null,
      pendingActions,
      continueScore,
    };
    signalsByCampaignId.set(campaignId, signals);

    ranked.push({
      campaignId,
      handle: campaign.handle,
      name: campaign.name,
      heroImageUrl: null,
      role,
      continueScore,
      continueReason: buildContinueReason({
        unreadCount,
        nextSession,
        pendingActions,
        lastActivityAt,
      }),
      continueCta: buildContinueCta(campaign.handle, role, nextSession, pendingActions),
      signals,
    });
  }

  ranked.sort(
    (a, b) =>
      b.continueScore - a.continueScore || a.name.localeCompare(b.name),
  );

  const pinned = input.pinnedCampaignIds ?? [];
  const resumeHero = selectResumeHeroCandidates(ranked, pinned, 4);
  const continueTop = resumeHero.slice(0, 3);

  const continueFeed: HubContinueEntityItem[] = [];
  const feedCampaigns = ranked.slice(0, 5);

  await Promise.all(
    feedCampaigns.map(async (candidate) => {
      const nextSession = nextSessionsMap.get(candidate.campaignId) ?? null;
      const lastSession = await fetchLastDashboardSession(
        candidate.campaignId,
        candidate.role,
      );
      const items = await buildContinueWhereYouLeftOff({
        campaignId: candidate.campaignId,
        campaignHandle: candidate.handle,
        userId: input.userId,
        role: candidate.role,
        nextSession,
        lastSession,
      });

      for (const item of items.slice(0, 2)) {
        continueFeed.push({
          campaignId: candidate.campaignId,
          campaignName: candidate.name,
          campaignHandle: candidate.handle,
          entityType: item.entityType,
          entityId: item.entityId,
          title: item.title,
          href: item.href,
          reason: item.reason,
          updatedAt: item.updatedAt,
          score: candidate.continueScore,
        });
      }
    }),
  );

  continueFeed.sort((a, b) => b.score - a.score);

  return {
    continue: continueTop,
    resumeHero,
    continueFeed: continueFeed.slice(0, 8),
    signalsByCampaignId,
  };
}

export async function countSessionsThisWeek(campaignIds: string[]): Promise<number> {
  if (campaignIds.length === 0) return 0;
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 3_600_000);
  return prisma.campaignSessionSchedule.count({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: now, lte: weekEnd },
      timelinePoint: { campaignId: { in: campaignIds } },
    },
  });
}
