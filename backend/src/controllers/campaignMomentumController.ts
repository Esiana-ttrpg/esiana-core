import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  getCampaignMomentumPayload,
  updateCampaignMomentumState,
  type CampaignMomentumPayload,
} from '../lib/campaignMomentumService.js';
import { listPacingSimulationRuns } from '../lib/pacingSimulationRunsService.js';
import {
  buildCampaignWorldPressureProjection,
  canAccessWorldPressure,
} from '../lib/worldPressureProjectionService.js';

function requireWorldPressureAccess(
  req: CampaignScopedRequest,
  res: Response,
): boolean {
  const ctx = req.campaign!;
  if (!canAccessWorldPressure(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}


export async function getCampaignMomentumHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!requireWorldPressureAccess(req, res)) return;
  const ctx = req.campaign!;
  const payload: CampaignMomentumPayload = await getCampaignMomentumPayload(ctx.campaignId);
  res.json(payload);
}

export async function putCampaignMomentumHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!requireWorldPressureAccess(req, res)) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.eras !== undefined) {
    res.status(400).json({ error: 'Manage eras through Chronology.' }); return;
  }
  const worldPressurePaused =
    typeof body.worldPressurePaused === 'boolean' ? body.worldPressurePaused : undefined;

  try {
    const payload = await updateCampaignMomentumState({
      campaignId: ctx.campaignId,
      worldPressurePaused,
      updatedByUserId: req.user?.id ?? null,
    });
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function getWorldPressureHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!requireWorldPressureAccess(req, res)) return;
  const ctx = req.campaign!;
  const projection = await buildCampaignWorldPressureProjection(ctx.campaignId);
  res.json({ projection });
}

function parseTargetEpochMinuteQuery(raw: unknown): string | null {
  if (raw == null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const trimmed = String(value).trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return trimmed;
}

export async function getWorldPressurePreviewHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!requireWorldPressureAccess(req, res)) return;
  const ctx = req.campaign!;
  const targetEpochMinute = parseTargetEpochMinuteQuery(req.query.targetEpochMinute);
  if (!targetEpochMinute) {
    res.status(400).json({ error: 'targetEpochMinute is required (non-negative integer)' });
    return;
  }

  const projection = await buildCampaignWorldPressureProjection(ctx.campaignId, {
    targetEpochMinute,
    includeSessionForecast: false,
  });

  res.json({
    projection,
    targetEpochMinute,
    resolvedEraId: projection.currentEra.id,
  });
}

export async function getPacingSimulationRunsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!requireWorldPressureAccess(req, res)) return;
  const ctx = req.campaign!;
  const runs = await listPacingSimulationRuns(ctx.campaignId);
  res.json({ runs });
}
