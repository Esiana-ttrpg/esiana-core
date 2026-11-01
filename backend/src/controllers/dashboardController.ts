import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  normalizeDashboardConfig,
  parseDashboardLayoutPayload,
} from '../lib/dashboardConfig.js';
import {
  respondAssetReferenceValidationError,
  validateHeroCoverImageSave,
} from '../lib/assetReferenceValidation.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { dashboardPresentation } from '../../../shared/dashboardPresentation.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { composeInitialDashboard, meetsDashboardEligibility } from '../../../shared/dashboardCampaignFeatures.js';
import { dashboardMaps, dashboardSpotlight } from '../lib/dashboardContent.js';
import { campaignAnnouncements } from '../lib/campaignAnnouncements.js';
import { dashboardActions } from '../lib/dashboardActions.js';
import { buildCampaignStatistics } from '../lib/stats/buildCampaignStatistics.js';
import { buildDashboardQuestLedgerEntries } from '../lib/dashboardQuestLedger.js';
import { buildDashboardThreadBundle } from '../lib/dashboardThreadLedger.js';
import { buildDashboardSummary } from '../lib/buildDashboardSummary.js';
import { buildDashboardSessionFollowUp } from '../lib/dashboardSessionFollowUp.js';
import { buildRecentLoreFeed } from '../lib/buildRecentEntityFeed.js';
import { buildCampaignNarrativeSnapshot } from '../lib/buildCampaignNarrativeSnapshot.js';
import { buildRecentEntitiesFeed } from '../lib/buildRecentEntitiesFeed.js';
import { buildDashboardWorldEventsFeed } from '../lib/buildDashboardWorldEventsFeed.js';
import { buildFactionConflictFeed } from '../lib/buildFactionConflictFeed.js';
import {
  normalizeRecentEntitiesConfig,
} from '../../../shared/dashboardRecentEntitiesCatalog.js';
import {
  normalizeWorldEventsConfig,
} from '../../../shared/dashboardWorldEventsCatalog.js';
import {
  normalizeFactionConflictConfig,
} from '../../../shared/dashboardFactionConflictCatalog.js';

export async function getDashboardBundle(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  // Adapt legacy feed builders to capabilities, including explicit overrides.
  const role = req.campaign!.capabilities.has(C.NARRATIVE_ELEVATED_VIEW) ? 'GAMEMASTER' : req.campaign!.capabilities.has(C.WIKI_VIEW_PARTY) ? 'PARTICIPANT' : null;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      handle: true,
      dashboardConfig: true,
      description: true,
      scheduleDay: true,
      scheduleTime: true,
      scheduleFrequency: true,
      scheduleTimezone: true,
      allowPlayerChronologyManagement: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const ctx = req.campaign!;
  const dashboardConfig = normalizeDashboardConfig(campaign.dashboardConfig);
  if (dashboardConfig.layoutMode === 'initial') dashboardConfig.widgets = composeInitialDashboard(dashboardConfig.widgets, ctx.capabilities, ctx.isMember);
  const campaignHandle =
    req.campaign!.campaignHandle ?? campaign.handle ?? req.params.campaignHandle ?? '';

  const eligibleWidgetIds = dashboardConfig.widgets.filter(widget => meetsDashboardEligibility(dashboardPresentation(widget.id).eligibility, ctx.capabilities, ctx.isMember)).map(widget => widget.id);
  const enabledIds = new Set(dashboardConfig.widgets.filter(w => w.enabled && eligibleWidgetIds.includes(w.id)).map(w => w.id));
  const recentEntitiesPlacement = dashboardConfig.widgets.find(
    (w) => w.id === 'recentEntities',
  );
  const worldEventsPlacement = dashboardConfig.widgets.find((w) => w.id === 'worldEvents');
  const factionsAtWarPlacement = dashboardConfig.widgets.find(
    (w) => w.id === 'factionsAtWar',
  );

  const [questPages, threadBundle, summary, recentLore, recentEntities, worldEvents, factionConflict] =
    await Promise.all([
    buildDashboardQuestLedgerEntries(campaignId, role, { limit: 8 }),
    buildDashboardThreadBundle(campaignId, role),
    buildDashboardSummary({
      campaignId,
      campaignHandle,
      role,
      viewerUserId: req.user?.id ?? null,
    }),
    buildRecentLoreFeed(campaignId, campaignHandle, role, 3),
    enabledIds.has('recentEntities')
      ? buildRecentEntitiesFeed({
          campaignId,
          campaignHandle,
          role,
          config: normalizeRecentEntitiesConfig(recentEntitiesPlacement?.config),
        })
      : Promise.resolve(null),
    enabledIds.has('worldEvents')
      ? buildDashboardWorldEventsFeed({
          campaignId,
          campaignHandle,
          role,
          allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement ?? false,
          config: normalizeWorldEventsConfig(worldEventsPlacement?.config),
        })
      : Promise.resolve(null),
    enabledIds.has('factionsAtWar')
      ? buildFactionConflictFeed({
          campaignId,
          campaignHandle,
          role,
          allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement ?? false,
          config: normalizeFactionConflictConfig(factionsAtWarPlacement?.config),
        })
      : Promise.resolve(null),
  ]);

  const recentActivity = recentLore.items.map((item) => ({
    id: item.entityId,
    title: item.title,
    updatedAt: item.updatedAt,
    createdAt: item.updatedAt,
  }));

  if (summary.lastSession) {
    summary.lastSession.followUp = await buildDashboardSessionFollowUp({ ...req.campaign!, campaignHandle }, req.user?.id, summary.lastSession);
  }

  const widgetConfig = (id: string) => dashboardConfig.widgets.find(widget => widget.id === id)?.config;
  const [maps, spotlight, announcements, actions, statistics] = await Promise.all([
    enabledIds.has('campaignMap') ? dashboardMaps(ctx, widgetConfig('campaignMap')?.mapId, ctx.capabilities.has(C.CAMPAIGN_SETTINGS_EDIT)).catch(() => null) : null,
    enabledIds.has('pageSpotlight') ? dashboardSpotlight(ctx, widgetConfig('pageSpotlight')?.pageId).catch(() => null) : null,
    enabledIds.has('campaignAnnouncements') ? campaignAnnouncements(campaignId).catch(() => []) : [],
    enabledIds.has('needsAttention') ? dashboardActions(ctx, req.user?.id, summary).catch(() => []) : [],
    enabledIds.has('campaignStatistics') ? buildCampaignStatistics(ctx, 30).catch(() => null) : null,
  ]);

  const narrativeSnapshot = await buildCampaignNarrativeSnapshot({
    campaignId,
    campaignHandle,
    role,
    dashboardConfig,
    summary,
    questPages,
    threadBundle,
    campaignDescription: campaign.description,
  });

  // Layout settings are shared, but a spotlight introduction can identify its
  // inaccessible source. Redact only the read response for non-editors; never
  // mutate or save the authored placement when access changes.
  const responseConfig = ctx.capabilities.has(C.CAMPAIGN_SETTINGS_EDIT) ? dashboardConfig : {
    ...dashboardConfig,
    widgets: dashboardConfig.widgets.map(widget => {
      if (widget.id === 'pageSpotlight' && !spotlight) return { ...widget, config: { ...widget.config, pageId: null, introduction: '' } };
      if (widget.id === 'campaignMap' && !maps?.preview) return { ...widget, config: { ...widget.config, mapId: null, description: '' } };
      return widget;
    }),
  };

  res.json({
    dashboardConfig: responseConfig,
    campaignDescription: campaign.description,
    schedule: summary.schedule,
    questPages,
    threadBundle,
    /** @deprecated Prefer threadBundle.living */
    openThreads: threadBundle.living,
    recentActivity,
    summary,
    narrativeSnapshot,
    viewer: { isMember: ctx.isMember, capabilities: [...ctx.capabilities], eligibleWidgetIds },
    features: { map: maps?.preview ?? null, mapOptions: maps?.options ?? [], spotlight, announcements, actions, statistics },
    ...(recentEntities ? { recentEntities } : {}),
    ...(worldEvents ? { worldEvents } : {}),
    ...(factionConflict ? { factionConflict } : {}),
  });
}

export async function updateDashboardLayout(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const parsed = parseDashboardLayoutPayload(req.body);
  if (!parsed) {
    res.status(400).json({
      error:
        'Invalid dashboard payload. Expected { hero, widgets: Array<{ id, x, y, w, h, enabled }> }.',
    });
    return;
  }

  try {
    const body = req.body as { hero?: unknown };
    if (body.hero !== undefined) {
      validateHeroCoverImageSave(body.hero);
    }
  } catch (err) {
    if (respondAssetReferenceValidationError(res, err)) return;
    throw err;
  }

  const campaignId = req.campaign!.campaignId;
  const dashboardConfig = normalizeDashboardConfig(parsed);

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { dashboardConfig: dashboardConfig as object },
    select: { dashboardConfig: true },
  });

  res.json({
    dashboardConfig: normalizeDashboardConfig(updated.dashboardConfig),
  });
}
