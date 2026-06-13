import { prisma } from './prisma.js';
import { buildEnsembleBundle } from './buildEnsembleBundle.js';
import { buildRecentEntityFeed } from './buildRecentEntityFeed.js';
import {
  buildDashboardChronometer,
  formatChronometerStatusLabel,
} from './buildDashboardChronometer.js';
import {
  fetchLastDashboardSession,
  fetchNextDashboardSession,
  formatSessionStatusLabel,
} from './buildDashboardSessions.js';
import {
  buildContinueWhereYouLeftOff,
  buildPersonalPinned,
} from './buildContinueWhereYouLeftOff.js';
import { mapCampaignActivityToBulletinItem } from './dashboardActivityCopy.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { getSpoilerSafeWorldActivitySummary } from './narrativeEventService.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import type { DashboardConfig } from './dashboardConfig.js';
import type { RecentEntityFeedItem } from './recentEntityFeedTypes.js';
import type { EnsembleBundleMember } from './buildEnsembleBundle.js';
import {
  buildWorldPressurePreview,
  type WorldPressurePreview,
} from './worldPressureProjectionService.js';

export type DashboardSummary = {
  statusStrip: {
    cadenceLabel: string | null;
    sessionLabel: string | null;
    worldTimeLabel: string | null;
    partyLabel: string | null;
    recruitmentLabel: string | null;
  };
  schedule: {
    day: string | null;
    time: string | null;
    frequency: string | null;
    timezone: string | null;
  };
  nextSession: Awaited<ReturnType<typeof fetchNextDashboardSession>>;
  lastSession: Awaited<ReturnType<typeof fetchLastDashboardSession>>;
  chronometer: Awaited<ReturnType<typeof buildDashboardChronometer>>;
  recent: { items: RecentEntityFeedItem[] };
  campaignPulse: {
    lorePagesUpdatedWeek: number;
    nextSessionInDays: number | null;
    lines: string[];
  };
  party: { members: EnsembleBundleMember[] };
  bulletin: {
    announcementsMarkdown: string | null;
    activity: ReturnType<typeof mapCampaignActivityToBulletinItem>[];
  };
  personal: {
    shortcuts: Array<{ pageId: string; title: string; sortOrder: number }>;
    pinned: Array<{ id: string; title: string; href: string; freshnessLabel?: string | null }>;
    recentlyTouched: Array<{ id: string; title: string; updatedAt: string }>;
    continueWhereYouLeftOff: Awaited<ReturnType<typeof buildContinueWhereYouLeftOff>>;
  } | null;
  dmOverlay?: {
    openUnresolvedCount: number;
    recentPlayerEditsCount: number;
  };
  worldPressurePreview?: WorldPressurePreview | null;
};

function formatCadenceLabel(input: {
  frequency: string | null;
  day: string | null;
  time: string | null;
  timezone: string | null;
}): string | null {
  const parts: string[] = [];
  if (input.frequency?.trim()) parts.push(input.frequency.trim());
  if (input.day?.trim() && input.time?.trim()) {
    parts.push(`${input.day.trim()} ${input.time.trim()}`);
  } else if (input.day?.trim()) {
    parts.push(input.day.trim());
  } else if (input.time?.trim()) {
    parts.push(input.time.trim());
  }
  if (input.timezone?.trim()) parts.push(input.timezone.trim());
  return parts.length > 0 ? parts.join(' · ') : null;
}

function extractAnnouncementsMarkdown(dashboardConfig: DashboardConfig): string | null {
  const bulletin = dashboardConfig.widgets.find((w) => w.id === 'campaignBulletin');
  const legacy = dashboardConfig.widgets.find((w) => w.id === 'announcements');
  const widget = bulletin ?? legacy;
  const body = widget?.config?.body;
  return typeof body === 'string' && body.trim() ? body.trim() : null;
}

function isDmRole(role: CampaignMemberRole | null): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

export async function buildDashboardSummary(input: {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  viewerUserId: string | null;
  dashboardConfig: DashboardConfig;
}): Promise<DashboardSummary> {
  const { campaignId, campaignHandle, role, viewerUserId, dashboardConfig } = input;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    campaign,
    nextSession,
    lastSession,
    chronometer,
    recentFeed,
    worldActivity,
    ensemble,
    activityRows,
    unresolvedCount,
    playerMembers,
  ] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        scheduleDay: true,
        scheduleTime: true,
        scheduleFrequency: true,
        scheduleTimezone: true,
        isLookingForGroup: true,
      },
    }),
    fetchNextDashboardSession(campaignId),
    fetchLastDashboardSession(campaignId, role),
    buildDashboardChronometer(campaignId),
    buildRecentEntityFeed(campaignId, campaignHandle, role, viewerUserId, { limit: 12 }),
    getSpoilerSafeWorldActivitySummary(campaignId, weekAgo),
    buildEnsembleBundle(campaignId, role),
    prisma.campaignActivity.findMany({
      where: { campaignId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 8,
      select: {
        id: true,
        actionType: true,
        entityType: true,
        entityId: true,
        entityName: true,
        parentContext: true,
        createdAt: true,
      },
    }),
    isDmRole(role)
      ? prisma.unresolvedWikilink.count({
          where: { campaignId, ignoredAt: null },
        })
      : Promise.resolve(0),
    prisma.campaignMember.findMany({
      where: {
        campaignId,
        role: {
          in: [
            CampaignMemberRoles.PARTICIPANT,
            CampaignMemberRoles.PARTICIPANT,
            CampaignMemberRoles.OBSERVER,
          ],
        },
      },
      select: { userId: true },
    }),
  ]);

  const schedule = {
    day: campaign?.scheduleDay ?? null,
    time: campaign?.scheduleTime ?? null,
    frequency: campaign?.scheduleFrequency ?? null,
    timezone: campaign?.scheduleTimezone ?? null,
  };

  const cadenceLabel = formatCadenceLabel(schedule);
  const sessionLabel = formatSessionStatusLabel(nextSession, lastSession);
  const worldTimeLabel = formatChronometerStatusLabel(chronometer);
  const partyCount = playerMembers.length;
  const partyLabel =
    partyCount > 0
      ? `${partyCount} ${partyCount === 1 ? 'player' : 'players'} at the table`
      : null;

  let recruitmentLabel: string | null = null;
  if (campaign?.isLookingForGroup) {
    recruitmentLabel = 'Recruitment open';
  } else if (campaign && !campaign.isLookingForGroup) {
    recruitmentLabel = 'Recruitment paused';
  }

  let nextSessionInDays: number | null = null;
  if (nextSession?.plannedStartAt) {
    const diffMs = new Date(nextSession.plannedStartAt).getTime() - Date.now();
    nextSessionInDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const pulseLines: string[] = [];
  if (worldActivity.pagesEdited > 0) {
    pulseLines.push(
      `${worldActivity.pagesEdited} lore ${worldActivity.pagesEdited === 1 ? 'page' : 'pages'} expanded this week`,
    );
  }
  if (nextSessionInDays !== null) {
    if (nextSessionInDays === 0) {
      pulseLines.push('Next session is today');
    } else if (nextSessionInDays === 1) {
      pulseLines.push('Next session tomorrow');
    } else {
      pulseLines.push(`Next session in ${nextSessionInDays} days`);
    }
  }
  if (isDmRole(role) && unresolvedCount > 0) {
    pulseLines.push(
      `${unresolvedCount} unresolved ${unresolvedCount === 1 ? 'reference' : 'references'}`,
    );
  }

  const wikiActivityIds = activityRows
    .filter((row) => row.entityType.toUpperCase() === 'WIKI_PAGE')
    .map((row) => row.entityId);
  const wikiPagesForActivity =
    wikiActivityIds.length > 0
      ? await prisma.wikiPage.findMany({
          where: { campaignId, id: { in: wikiActivityIds } },
          select: wikiPageHrefSelect,
        })
      : [];
  const wikiPageById = new Map(wikiPagesForActivity.map((page) => [page.id, page]));

  const bulletinActivity = activityRows.map((row) =>
    mapCampaignActivityToBulletinItem(
      row,
      campaignHandle,
      wikiPageById.get(row.entityId),
    ),
  );

  let personal: DashboardSummary['personal'] = null;
  if (viewerUserId) {
    const [shortcuts, pinned, continueList, touchedRows] = await Promise.all([
      prisma.pageShortcut.findMany({
        where: { userId: viewerUserId, campaignId },
        include: { page: { select: { id: true, title: true } } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      buildPersonalPinned(campaignId, campaignHandle, viewerUserId, role),
      buildContinueWhereYouLeftOff({
        campaignId,
        campaignHandle,
        userId: viewerUserId,
        role,
        nextSession,
        lastSession,
      }),
      prisma.wikiPageStats.findMany({
        where: { campaignId, lastEditedByUserId: viewerUserId },
        select: {
          pageId: true,
          lastEditedAt: true,
          page: { select: { title: true, visibility: true } },
        },
        orderBy: [{ lastEditedAt: 'desc' }, { pageId: 'asc' }],
        take: 10,
      }),
    ]);

    const { canViewWikiPage } = await import('./wikiTree.js');

    personal = {
      shortcuts: shortcuts.map((s) => ({
        pageId: s.pageId,
        title: s.page.title,
        sortOrder: s.sortOrder,
      })),
      pinned,
      recentlyTouched: touchedRows
        .filter((row) => canViewWikiPage(row.page.visibility, role))
        .map((row) => ({
          id: row.pageId,
          title: row.page.title,
          updatedAt: row.lastEditedAt.toISOString(),
        })),
      continueWhereYouLeftOff: continueList,
    };
  }

  let dmOverlay: DashboardSummary['dmOverlay'];
  if (isDmRole(role)) {
    const recentPlayerEditsCount =
      playerMembers.length > 0
        ? await prisma.campaignActivity.count({
            where: {
              campaignId,
              createdAt: { gte: weekAgo },
              userId: { in: playerMembers.map((m) => m.userId) },
            },
          })
        : 0;
    dmOverlay = { openUnresolvedCount: unresolvedCount, recentPlayerEditsCount };
  }

  const worldPressurePreview = isDmRole(role)
    ? await buildWorldPressurePreview(campaignId, { daysUntilNextSession: nextSessionInDays })
    : null;

  return {
    statusStrip: {
      cadenceLabel,
      sessionLabel,
      worldTimeLabel,
      partyLabel,
      recruitmentLabel,
    },
    schedule,
    nextSession,
    lastSession,
    chronometer,
    recent: recentFeed,
    campaignPulse: {
      lorePagesUpdatedWeek: worldActivity.pagesEdited,
      nextSessionInDays,
      lines: pulseLines,
    },
    party: { members: ensemble?.members ?? [] },
    bulletin: {
      announcementsMarkdown: extractAnnouncementsMarkdown(dashboardConfig),
      activity: bulletinActivity,
    },
    personal,
    dmOverlay,
    worldPressurePreview,
  };
}
