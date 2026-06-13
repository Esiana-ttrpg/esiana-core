import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { searchPluginCollections } from '../lib/plugins/pluginSearchRegistry.js';

export async function searchCampaignPlugins(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const query = String(req.query.q ?? req.query.query ?? '').trim();
  const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(limitRaw, 50) : 20;
  const results = await searchPluginCollections(req.campaign!.campaignId, query, limit);
  res.json({ results });
}
