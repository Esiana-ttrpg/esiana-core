import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  campaignSelect,
  computePublicHost,
  serializeCampaignForList,
} from './campaignsController.js';
import {
  buildHubContinueRanking,
  countSessionsThisWeek,
} from '../lib/buildHubContinueRanking.js';
import { extractHeroImageUrl } from '../lib/recruitmentListing.js';
import {
  buildHubBatchSignalsForCampaigns,
  mergeGlobalRecentEdits,
  type CampaignHubContext,
} from '../lib/buildHubBatchSignals.js';
import {
  buildAttentionItemsForCampaign,
  buildHubAttentionQueue,
  buildUpcomingChips,
} from '../lib/buildHubAttentionQueue.js';
import { buildArcIdentity } from '../lib/buildHubNarrativeLabels.js';
import { CampaignDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';

function isManagerRole(role: CampaignMemberRole | null): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function isJoinedRole(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.PARTICIPANT ||
    role === CampaignMemberRoles.OBSERVER
  );
}

export async function getUserHub(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;

  const [memberships, pinRows, dismissalRows] = await Promise.all([
    prisma.campaignMember.findMany({
      where: {
        userId,
        campaign: { archivedAt: null },
      },
      include: {
        campaign: { select: campaignSelect() },
      },
      orderBy: { campaign: { name: 'asc' } },
    }),
    prisma.userCampaignPin.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      select: { campaignId: true, sortOrder: true },
    }),
    prisma.userHubAttentionDismissal.findMany({
      where: {
        userId,
        OR: [{ snoozeUntil: null }, { snoozeUntil: { gt: new Date() } }],
      },
      select: { dismissKey: true },
    }),
  ]);

  const pinnedCampaignIds = pinRows.map((p) => p.campaignId);
  const dismissedKeys = new Set(dismissalRows.map((d) => d.dismissKey));
  const memberCampaignIds = memberships.map((m) => m.campaignId);

  const publicCampaigns = await prisma.campaign.findMany({
    where: {
      discoverability: CampaignDiscoverability.PUBLIC,
      archivedAt: null,
      id: { notIn: memberCampaignIds },
    },
    select: {
      ...campaignSelect(),
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const ranking = await buildHubContinueRanking({
    userId,
    pinnedCampaignIds,
    memberships: memberships.map((m) => ({
      campaignId: m.campaignId,
      role: m.role as CampaignMemberRole,
      campaign: {
        id: m.campaign.id,
        handle: m.campaign.handle,
        name: m.campaign.name,
        updatedAt: m.campaign.updatedAt,
      },
    })),
  });

  const hubContexts: CampaignHubContext[] = memberships.map((m) => ({
    campaignId: m.campaignId,
    handle: m.campaign.handle,
    name: m.campaign.name,
    role: m.role as CampaignMemberRole,
    description: m.campaign.description,
    recruitmentTagline: m.campaign.recruitmentTagline,
    dashboardConfig: m.campaign.dashboardConfig,
  }));

  const nextSessionByCampaignId = new Map<
    string,
    { timelinePointId: string; plannedStartAt: string | null }
  >();
  const lastActivityByCampaignId = new Map<string, string | null>();
  const needsRsvpByCampaignId = new Map<string, boolean>();

  for (const [campaignId, signals] of ranking.signalsByCampaignId) {
    lastActivityByCampaignId.set(campaignId, signals.lastActivityAt);
    if (signals.nextSession) {
      nextSessionByCampaignId.set(campaignId, {
        timelinePointId: signals.nextSession.timelinePointId,
        plannedStartAt: signals.nextSession.plannedStartAt,
      });
    }
    needsRsvpByCampaignId.set(
      campaignId,
      signals.pendingActions.some((a) => a.type === 'RSVP'),
    );
  }

  const batchSignals = await buildHubBatchSignalsForCampaigns({
    contexts: hubContexts,
    lastActivityByCampaignId,
    nextSessionByCampaignId,
  });

  const attentionContexts = hubContexts.map((ctx) => ({
    campaignId: ctx.campaignId,
    campaignName: ctx.name,
    campaignHandle: ctx.handle,
    role: ctx.role,
    baseSignals: ranking.signalsByCampaignId.get(ctx.campaignId)!,
    batch: batchSignals.get(ctx.campaignId)!,
  }));

  const attentionQueue = buildHubAttentionQueue({
    contexts: attentionContexts,
    dismissedKeys,
  });

  const upcomingChips = buildUpcomingChips({
    contexts: hubContexts.map((ctx) => ({
      campaignId: ctx.campaignId,
      campaignName: ctx.name,
      campaignHandle: ctx.handle,
      nextSession: ranking.signalsByCampaignId.get(ctx.campaignId)?.nextSession ?? null,
      needsRsvp: needsRsvpByCampaignId.get(ctx.campaignId) ?? false,
    })),
  });

  const recentEdits = mergeGlobalRecentEdits(
    new Map(
      [...batchSignals.entries()].map(([id, sig]) => [id, sig.recentEdits]),
    ),
  );

  const resumeHeroIds = new Set(ranking.resumeHero.map((h) => h.campaignId));

  const campaignById = new Map<string, Record<string, unknown>>();

  for (const m of memberships) {
    const serialized = serializeCampaignForList(m.campaign as Record<string, unknown>);
    const baseSignals = ranking.signalsByCampaignId.get(m.campaignId);
    const batch = batchSignals.get(m.campaignId);
    const campaignAttention =
      baseSignals && batch
        ? buildAttentionItemsForCampaign({
            campaignId: m.campaignId,
            campaignName: m.campaign.name,
            campaignHandle: m.campaign.handle,
            role: m.role as CampaignMemberRole,
            baseSignals,
            batch,
          })
        : [];

    const arcIdentity = batch
      ? buildArcIdentity({
          heroCurrentArc: batch.heroCurrentArc,
          heroSummary: batch.heroSummary,
          topThreadTitle: batch.topThreadTitle,
          topQuestTitle: batch.topQuestTitle,
          recruitmentTagline: m.campaign.recruitmentTagline,
          description: m.campaign.description,
          lastSessionSnippet: batch.lastSession?.snippet ?? null,
          attentionItems: campaignAttention,
          recentEditTitles: batch.recentEdits.map((e) => e.title),
        })
      : { currentArc: null, tensionLine: null, continuityBullets: [] };

    campaignById.set(m.campaignId, {
      ...serialized,
      role: m.role,
      isMember: true,
      hubSignals: baseSignals
        ? {
            ...baseSignals,
            lastSession: batch?.lastSession ?? null,
            momentum: batch?.momentum ?? null,
            attentionCounts: batch?.attentionCounts ?? null,
            recentEdits: batch?.recentEdits ?? [],
            partyPreview: batch?.partyPreview ?? [],
            quickActions: batch?.quickActions ?? [],
            arcIdentity,
            featuredOnHearth: resumeHeroIds.has(m.campaignId),
          }
        : null,
    });
  }

  for (const c of publicCampaigns) {
    const host = computePublicHost(c.members);
    const { members: _members, ...rest } = c as typeof c & { members: unknown };
    campaignById.set(c.id, {
      ...serializeCampaignForList(rest as Record<string, unknown>),
      role: null,
      isMember: false,
      host,
      hubSignals: null,
    });
  }

  const pinOrder = new Map(pinnedCampaignIds.map((id, i) => [id, i]));

  const campaigns = [...campaignById.values()].sort((a, b) => {
    const idA = typeof a.id === 'string' ? a.id : '';
    const idB = typeof b.id === 'string' ? b.id : '';
    const pinA = pinOrder.get(idA);
    const pinB = pinOrder.get(idB);
    if (pinA != null && pinB != null && pinA !== pinB) return pinA - pinB;
    if (pinA != null && pinB == null) return -1;
    if (pinA == null && pinB != null) return 1;
    const nameA = typeof a.name === 'string' ? a.name : '';
    const nameB = typeof b.name === 'string' ? b.name : '';
    return nameA.localeCompare(nameB);
  });

  const mapContinueCandidate = (item: (typeof ranking.resumeHero)[0]) => {
    const campaign = campaignById.get(item.campaignId);
    const heroImageUrl =
      (campaign?.heroImageUrl as string | null | undefined) ??
      extractHeroImageUrl(
        memberships.find((m) => m.campaignId === item.campaignId)?.campaign
          .dashboardConfig,
      );

    return {
      campaign: campaign ?? {
        id: item.campaignId,
        handle: item.handle,
        name: item.name,
        heroImageUrl,
        role: item.role,
        isMember: true,
        hubSignals: item.signals,
      },
      score: item.continueScore,
      reason: item.continueReason,
      ctaLabel: item.continueCta.label,
      ctaHref: item.continueCta.href,
      unreadCount: item.signals.unreadCount,
    };
  };

  const resumeHero = ranking.resumeHero.map(mapContinueCandidate);
  const continueCandidates = ranking.continue.map(mapContinueCandidate);

  const [sessionsThisWeek, unreadAggregate] = await Promise.all([
    countSessionsThisWeek(memberCampaignIds),
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  const managedCount = memberships.filter((m) =>
    isManagerRole(m.role as CampaignMemberRole),
  ).length;
  const joinedCount = memberships.filter((m) =>
    isJoinedRole(m.role as CampaignMemberRole),
  ).length;

  res.json({
    continue: continueCandidates,
    resumeHero,
    continueFeed: ranking.continueFeed,
    campaigns,
    pinnedCampaignIds,
    attentionQueue,
    upcomingChips,
    recentEdits,
    stats: {
      managedCount,
      joinedCount,
      sessionsThisWeek,
      unreadNotifications: unreadAggregate,
    },
  });
}
