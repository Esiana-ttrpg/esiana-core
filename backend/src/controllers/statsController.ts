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
import { buildCampaignStatistics } from '../lib/stats/buildCampaignStatistics.js';
import { metricUnavailable } from '../../../shared/metricValue.js';
import { buildUserActivityFeed } from '../lib/stats/buildUserActivityFeed.js';

function parseActivityLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

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
  const payload = await buildUserCreatorAttribution(userId, userId, {
    includeOwnerHabits: true,
  });
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
  // Compatibility endpoint: do not reuse the old campaign-wide cache, whose
  // counters include hidden records and an inferred growth estimate.
  const days = Number(req.query.days ?? 30);
  const payload = await buildCampaignStatistics(req.campaign!, [7, 30, 90, 365].includes(days) ? days : 30);
  const find = (id: string) => payload.metrics.find(metric => metric.id === id)?.value ?? metricUnavailable('not_yet_tracked');
  res.json({ computedAt: payload.computedAt, refreshCadence: 'cached_5m', periodDays: payload.days,
    snapshot: { 'snapshot.pageCount': find('visiblePages'), 'snapshot.totalWords': metricUnavailable('not_yet_tracked'),
      'snapshot.characterCount': metricUnavailable('not_yet_tracked'), 'snapshot.locationCount': metricUnavailable('not_yet_tracked'),
      'snapshot.organizationCount': metricUnavailable('not_yet_tracked'), 'snapshot.connectionCount': metricUnavailable('not_yet_tracked'), 'snapshot.mapCount': metricUnavailable('not_yet_tracked') },
    period: { 'period.pagesCreated': find('creations'), 'period.pagesEdited': metricUnavailable('not_yet_tracked'),
      'period.wordsGrowthEstimate': metricUnavailable('not_yet_tracked'), 'period.wordsAdded': metricUnavailable('not_yet_tracked') }, recentEditors: [],
  });
}

export async function getPublicUserActivity(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = String(req.params.id ?? '').trim();
  if (!userId) {
    res.status(400).json({ error: 'User id is required' });
    return;
  }

  const viewerId = (req as AuthenticatedRequest).user?.id ?? null;
  const limit = parseActivityLimit(req.query.limit);
  const before =
    typeof req.query.before === 'string' ? req.query.before : null;

  const payload = await buildUserActivityFeed({
    profileUserId: userId,
    viewerUserId: viewerId,
    limit,
    before,
  });
  res.json(payload);
}

export async function getOwnerUserActivity(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const limit = parseActivityLimit(req.query.limit);
  const before =
    typeof req.query.before === 'string' ? req.query.before : null;

  const payload = await buildUserActivityFeed({
    profileUserId: userId,
    viewerUserId: userId,
    limit,
    before,
  });
  res.json(payload);
}
