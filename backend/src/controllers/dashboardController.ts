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
import { buildDashboardQuestLedgerEntries } from '../lib/dashboardQuestLedger.js';
import { buildDashboardThreadBundle } from '../lib/dashboardThreadLedger.js';
import { buildDashboardSummary } from '../lib/buildDashboardSummary.js';
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
  const role = req.campaign!.role;

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

  const dashboardConfig = normalizeDashboardConfig(campaign.dashboardConfig);
  const campaignHandle =
    req.campaign!.campaignHandle ?? campaign.handle ?? req.params.campaignHandle ?? '';

  const enabledIds = new Set(
    dashboardConfig.widgets.filter((w) => w.enabled).map((w) => w.id),
  );
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

  res.json({
    dashboardConfig,
    campaignDescription: campaign.description,
    schedule: summary.schedule,
    questPages,
    threadBundle,
    /** @deprecated Prefer threadBundle.living */
    openThreads: threadBundle.living,
    recentActivity,
    summary,
    narrativeSnapshot,
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
