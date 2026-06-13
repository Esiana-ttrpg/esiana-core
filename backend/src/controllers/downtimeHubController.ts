import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { SnapshotKind } from '../../../shared/narrativeSnapshots.js';
import {
  DOWNTIME_HUB_TITLE,
  DOWNTIME_PLACEHOLDER_FRAMING,
  normalizeDowntimeSection,
  type DowntimeHubPayload,
  type DowntimeSectionId,
} from '../../../shared/downtimeHub.js';
import {
  countActiveDowntimeProjects,
  listDowntimeProjectDetails,
} from '../lib/downtimeProjectService.js';
import {
  countDowntimeHavens,
  listDowntimeHavens,
  resolveWikiPageTitles,
} from '../lib/downtimeHavenService.js';
import {
  buildHavenSituationCards,
} from '../lib/buildHavenPresentation.js';
import { canManageNotebooksFromActor } from '../lib/acl.js';
import { buildCreativeDriftScan } from '../lib/creativeDriftService.js';
import { buildConvergenceOverlay } from '../lib/chronologyConvergenceService.js';
import { buildDashboardChronometer } from '../lib/buildDashboardChronometer.js';
import {
  buildDowntimeSimulationSnapshot,
  buildDowntimeWorldEventsPayload,
  buildDowntimeProjectOperationCards,
  DOWNTIME_WORLD_EVENT_DOMAINS,
} from '../lib/buildDowntimePresentation.js';
import { loadEventConsequencePresentation } from '../lib/buildEventConsequencePresentation.js';
import { buildCampaignWorldPressureProjection } from '../lib/worldPressureProjectionService.js';
import { buildCurrentDowntimePeriodPresentation } from '../lib/downtimePeriodProjectionService.js';
import { loadQuestTimeFeedPresentation } from '../lib/buildQuestTimeFeedPresentation.js';
import { loadDowntimePressurePresentation } from '../lib/loadDowntimePressurePresentation.js';
import { emptyDowntimePressurePresentation } from '../../../shared/downtimeContinuityIntegration.js';
import { ensureDowntimeSystemCategoryKey } from '../lib/ensureDowntimeSystemCategoryKey.js';
import { listWorldAdvanceBatches } from '../lib/worldAdvanceService.js';
import {
  isDowntimeCategoryPage,
  parseSystemCategoryKey,
} from '../lib/wikiSystemCategory.js';
import { buildLedgerHubPayload } from '../lib/campaignLedgerService.js';
import { getScheduledTreasuryPulseHint } from '../lib/scheduledEffectService.js';
import { countPendingReputationSuggestions } from '../lib/reputationSuggestionService.js';
import { buildWorldEventSuggestionsForHub } from '../lib/buildWorldEventsPresentation.js';
import { prisma } from '../lib/prisma.js';

function placeholderPayload(section: Exclude<DowntimeSectionId, 'worldEvents'>) {
  const framing = DOWNTIME_PLACEHOLDER_FRAMING[section];
  return {
    status: 'planned' as const,
    phase: framing.phase,
    framing,
  };
}

async function loadPresentationContext(
  req: CampaignScopedRequest,
  campaignHandle: string,
) {
  const ctx = req.campaign!;
  const canManage = canManageNotebooksFromActor(ctx.actor);

  const [campaign, chronometer, creativeDrift, snapshots, batches] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    }),
    buildDashboardChronometer(ctx.campaignId),
    buildCreativeDriftScan(ctx.campaignId, ctx.role),
    prisma.narrativeStateSnapshot.findFirst({
      where: {
        campaignId: ctx.campaignId,
        kind: {
          in: [SnapshotKind.MILESTONE, SnapshotKind.PARTY_VISIT, SnapshotKind.MANUAL],
        },
      },
      orderBy: { capturedAtEpochMinute: 'desc' },
      select: { capturedAtEpochMinute: true },
    }),
    canManage ? listWorldAdvanceBatches(ctx.campaignId, 1) : Promise.resolve([]),
  ]);

  const overlay = await buildConvergenceOverlay({
    campaignId: ctx.campaignId,
    campaignHandle,
    role: ctx.role,
    allowPlayerChronologyManagement: ctx.allowPlayerChronologyManagement ?? false,
    window: { mode: 'YEAR_RANGE', from: '0', to: '9999' },
    domains: [...DOWNTIME_WORLD_EVENT_DOMAINS],
    sessionLinkedOnly: false,
    includeSuppressed: canManage,
  });

  return {
    currentEpochMinute: campaign?.currentEpochMinute ?? 0n,
    chronometer,
    sinceEpochMinute: snapshots?.capturedAtEpochMinute ?? null,
    overlayEntries: overlay.entries,
    creativeDrift,
    latestWorldAdvanceHeadline: batches[0]?.headline ?? null,
  };
}

export async function buildDowntimeHubResponse(
  req: CampaignScopedRequest,
  res: Response,
  downtimeRootId: string,
): Promise<void> {
  const ctx = req.campaign!;
  const section = normalizeDowntimeSection(req.query.section);
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const canManage = canManageNotebooksFromActor(ctx.actor);

  const category = await prisma.wikiPage.findFirst({
    where: { id: downtimeRootId, campaignId: ctx.campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      updatedAt: true,
    },
  });

  if (!category || !isDowntimeCategoryPage(category.metadata)) {
    res.status(404).json({ error: 'Downtime category page not found' });
    return;
  }

  const payload: DowntimeHubPayload = {
    category: {
      id: category.id,
      title: DOWNTIME_HUB_TITLE,
      parentId: category.parentId,
      visibility: category.visibility,
      updatedAt: category.updatedAt.toISOString(),
      systemCategoryKey: parseSystemCategoryKey(category.metadata),
    },
    activeSection: section,
  };

  if (section == null) {
    const [context, activeProjectCount, havenCount, pendingReputationCount, eventConsequences, questTimeFeed, pressurePresentation, worldPressure, currentDowntimePeriod, scheduledTreasuryPulse] =
      await Promise.all([
        loadPresentationContext(req, campaignHandle),
        countActiveDowntimeProjects(ctx.campaignId),
        countDowntimeHavens(ctx.campaignId),
        countPendingReputationSuggestions(ctx.campaignId),
        canManage
          ? loadEventConsequencePresentation(ctx.campaignId, campaignHandle)
          : Promise.resolve({ cards: [], pendingActionableCount: 0 }),
        canManage
          ? loadQuestTimeFeedPresentation({
              campaignId: ctx.campaignId,
              campaignHandle,
              currentEpochMinute: (await prisma.campaign.findUnique({
                where: { id: ctx.campaignId },
                select: { currentEpochMinute: true },
              }))?.currentEpochMinute ?? 0n,
            })
          : Promise.resolve({ items: [], downtimeCards: [], pendingActionableCount: 0 }),
        canManage
          ? loadDowntimePressurePresentation({
              campaignId: ctx.campaignId,
              campaignHandle,
              role: ctx.role,
              currentEpochMinute: (await prisma.campaign.findUnique({
                where: { id: ctx.campaignId },
                select: { currentEpochMinute: true },
              }))?.currentEpochMinute ?? 0n,
            })
          : Promise.resolve(emptyDowntimePressurePresentation()),
        canManage
          ? buildCampaignWorldPressureProjection(ctx.campaignId)
          : Promise.resolve(null),
        buildCurrentDowntimePeriodPresentation({
          campaignId: ctx.campaignId,
          campaignHandle,
        }),
        getScheduledTreasuryPulseHint(ctx.campaignId),
      ]);
    payload.overview = {
      simulationSnapshot: buildDowntimeSimulationSnapshot({
        campaignHandle,
        ...context,
        currentDowntimePeriod,
        activeProjectCount,
        havenCount,
        pendingReputationCount,
        eventConsequenceCards: eventConsequences.cards,
        pendingEventConsequenceCount: eventConsequences.pendingActionableCount,
        questTimeFeedCards: questTimeFeed.downtimeCards,
        pendingQuestTimeCount: questTimeFeed.pendingActionableCount,
        pressureCards: pressurePresentation.cards,
        pressureCounts: pressurePresentation.counts,
        worldPressure,
        scheduledTreasuryPulse,
      }),
    };
  } else if (section === 'worldEvents') {
    const [context, eventConsequences, worldEventSuggestions] = await Promise.all([
      loadPresentationContext(req, campaignHandle),
      canManage
        ? loadEventConsequencePresentation(ctx.campaignId, campaignHandle)
        : Promise.resolve({ cards: [], pendingActionableCount: 0 }),
      canManage
        ? buildWorldEventSuggestionsForHub(ctx.campaignId, campaignHandle, ctx.role)
        : Promise.resolve({ pendingSuggestions: [], pendingSuggestionsCount: 0 }),
    ]);
    payload.worldEvents = {
      ...buildDowntimeWorldEventsPayload(
        campaignHandle,
        context.overlayEntries,
        context.currentEpochMinute,
        { pendingConsequenceCount: eventConsequences.pendingActionableCount },
      ),
      pendingSuggestions: worldEventSuggestions.pendingSuggestions,
      pendingSuggestionsCount: worldEventSuggestions.pendingSuggestionsCount,
    };
  } else if (section === 'projects') {
    const projects = await listDowntimeProjectDetails(
      ctx.campaignId,
      campaignHandle,
      ctx.role,
      { includeTerminal: true },
    );
    payload.projects = {
      cards: buildDowntimeProjectOperationCards(projects),
      framing: DOWNTIME_PLACEHOLDER_FRAMING.projects,
    };
  } else if (section === 'havens') {
    const [havens, campaign] = await Promise.all([
      listDowntimeHavens(ctx.campaignId, campaignHandle, ctx.role),
      prisma.campaign.findUnique({
        where: { id: ctx.campaignId },
        select: { currentEpochMinute: true },
      }),
    ]);

    const residentLabelsByHaven = new Map<string, string[]>();
    for (const haven of havens) {
      const labels = await resolveWikiPageTitles(
        ctx.campaignId,
        haven.residentPageIds,
      );
      residentLabelsByHaven.set(
        haven.id,
        haven.residentPageIds.map((id) => labels.get(id) ?? 'Unknown'),
      );
    }

    payload.havens = {
      cards: buildHavenSituationCards(
        havens,
        residentLabelsByHaven,
        campaign?.currentEpochMinute ?? 0n,
      ),
      framing: DOWNTIME_PLACEHOLDER_FRAMING.havens,
    };
  } else if (section === 'reputation') {
    const { buildReputationHubPayload } = await import('../lib/buildReputationPresentation.js');
    payload.reputation = await buildReputationHubPayload(
      ctx.campaignId,
      campaignHandle,
      ctx.role,
    );
  } else if (section === 'ledger') {
    payload.ledger = await buildLedgerHubPayload(
      ctx.campaignId,
      campaignHandle,
      ctx.role,
      req.user?.id ?? null,
    );
  }

  res.json(payload);
}

export async function getDowntimeHubBySystemKey(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const downtimeRootId = await ensureDowntimeSystemCategoryKey(ctx.campaignId);
  if (!downtimeRootId) {
    res.status(404).json({ error: 'Downtime category page not found' });
    return;
  }
  await buildDowntimeHubResponse(req, res, downtimeRootId);
}

export async function getDowntimeHubIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  await ensureDowntimeSystemCategoryKey(ctx.campaignId);
  await buildDowntimeHubResponse(req, res, pageId);
}
