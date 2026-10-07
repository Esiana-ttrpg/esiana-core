import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { transformCampaignToPortfolio } from '../lib/portfolio/transform.js';

/** POST /wiki/:pageId/add-to-portfolio — clone campaign character into user portfolio. */
export async function addWikiCharacterToPortfolio(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  try {
    const result = await transformCampaignToPortfolio({
      userId: req.user!.id,
      campaignId: req.campaign!.campaignId,
      campaignCharacterPageId: String(req.params.pageId),
    });
    res.status(201).json(result);
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
    res.status(status).json({
      error: err instanceof Error ? err.message : 'Transform failed',
    });
  }
}
