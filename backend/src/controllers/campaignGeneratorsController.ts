import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { listEnabledCampaignGenerators } from '../lib/campaignGenerators.js';

export async function listCampaignGenerators(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const generators = await listEnabledCampaignGenerators();
  res.json({ generators });
}
