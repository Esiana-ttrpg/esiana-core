import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { buildVisualAtlasProjection } from '../lib/visualAtlasProjection.js';

export async function getVisualAtlas(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;

  const payload = await buildVisualAtlasProjection(ctx.campaignId, ctx.role);
  res.json(payload);
}
