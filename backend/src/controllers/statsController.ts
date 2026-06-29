import type { Response } from 'express';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  filterMetricsByPrivacy,
  type MetricContext,
} from '../../../shared/metricRegistry.js';
import type { MetricId } from '../../../shared/metricRegistry.js';
import type { MetricValue } from '../../../shared/metricValue.js';
import { buildUserCreatorAttribution } from '../lib/stats/buildUserCreatorAttribution.js';
import { getCachedCampaignWorldStats } from '../lib/stats/campaignWorldStatsCache.js';

function stripMetricsForContext(
  metrics: Partial<Record<MetricId, MetricValue>>,
  context: MetricContext,
): Partial<Record<MetricId, MetricValue>> {
  return filterMetricsByPrivacy(metrics, context);
}

export async function getPublicCreatorAttribution(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = String(req.params.id ?? '').trim();
  if (!userId) {
    res.status(400).json({ error: 'User id is required' });
    return;
  }

  const viewerId =
    (req as AuthenticatedRequest).user?.id ?? null;

  const payload = await buildUserCreatorAttribution(userId, viewerId);
  res.json({
    computedAt: payload.computedAt,
    refreshCadence: payload.refreshCadence,
    metrics: stripMetricsForContext(payload.metrics, 'publicProfile'),
    worldbuildingMix: payload.worldbuildingMix,
    linkableCampaigns: payload.linkableCampaigns,
  });
}

export async function getOwnerCreatorAttribution(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const payload = await buildUserCreatorAttribution(userId, userId);
  res.json({
    computedAt: payload.computedAt,
    refreshCadence: payload.refreshCadence,
    metrics: stripMetricsForContext(payload.metrics, 'ownerProfile'),
    worldbuildingMix: payload.worldbuildingMix,
    linkableCampaigns: payload.linkableCampaigns,
  });
}

export async function getCampaignWorldStats(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const periodDays = Math.min(
    90,
    Math.max(1, Number(req.query.days) || 30),
  );

  const payload = await getCachedCampaignWorldStats(campaignId, periodDays);
  const snapshot = stripMetricsForContext(
    payload.snapshot,
    'campaignMember',
  ) as Partial<Record<MetricId, MetricValue>>;
  const period = stripMetricsForContext(
    payload.period,
    'campaignMember',
  ) as Partial<Record<MetricId, MetricValue>>;

  res.json({
    computedAt: payload.computedAt,
    refreshCadence: payload.refreshCadence,
    periodDays: payload.periodDays,
    snapshot,
    period,
  });
}
