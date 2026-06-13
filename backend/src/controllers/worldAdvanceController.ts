import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  applyWorldAdvance,
  getWorldAdvanceBatchDetail,
  listWorldAdvanceBatches,
  previewWorldAdvance,
} from '../lib/worldAdvanceService.js';

export async function postWorldAdvancePreview(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const preview = await previewWorldAdvance(campaignId, req.body);
  if (!preview) {
    res.status(400).json({
      error:
        'Invalid world advance payload. Expected world-advance-v1 with at least one effect.',
    });
    return;
  }
  res.json(preview);
}

export async function postWorldAdvanceApply(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const actorUserId = req.user?.id;
  if (!actorUserId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const result = await applyWorldAdvance(campaignId, actorUserId, req.body);
    if (!result) {
      res.status(400).json({ error: 'Invalid world advance payload.' });
      return;
    }
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'NO_MASTER_CALENDAR') {
      res.status(400).json({
        error: 'Campaign needs a master fantasy calendar before advancing world state.',
      });
      return;
    }
    throw err;
  }
}

export async function getWorldAdvanceBatches(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const batches = await listWorldAdvanceBatches(campaignId);
  res.json({ batches });
}

export async function getWorldAdvanceBatchById(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const eventIdRaw = req.params.eventId;
  const eventId =
    typeof eventIdRaw === 'string'
      ? eventIdRaw
      : Array.isArray(eventIdRaw)
        ? eventIdRaw[0]
        : undefined;
  if (!eventId) {
    res.status(400).json({ error: 'eventId required' });
    return;
  }
  const detail = await getWorldAdvanceBatchDetail(campaignId, eventId);
  if (!detail) {
    res.status(404).json({ error: 'World advance batch not found' });
    return;
  }
  res.json(detail);
}
