import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { normalizeSourceReference } from '../../../shared/sourceReferences.js';
import { listSourceProviders, resolveSourceOpenTarget, resolveSourceReference, searchSources } from '../lib/plugins/sourceProviderRegistry.js';

export async function listCampaignSourceProviders(req: CampaignScopedRequest, res: Response): Promise<void> {
  res.json({ providers: await listSourceProviders(req.campaign!.campaignId) });
}

export async function searchCampaignSources(req: CampaignScopedRequest, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim().slice(0, 256);
  if (!query) { res.status(400).json({ error: 'q is required' }); return; }
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 20), 10) || 20, 1), 50);
  res.json(await searchSources({ campaignId: req.campaign!.campaignId, userId: req.user!.id, query, providerId: String(req.query.providerId ?? '').trim() || undefined, limit }));
}

function referenceFromBody(req: CampaignScopedRequest, res: Response) {
  const reference = normalizeSourceReference(req.body?.reference);
  if (!reference) res.status(400).json({ error: 'A valid source reference is required' });
  return reference;
}

export async function resolveCampaignSource(req: CampaignScopedRequest, res: Response): Promise<void> {
  const reference = referenceFromBody(req, res); if (!reference) return;
  const resolved = await resolveSourceReference({ campaignId: req.campaign!.campaignId, userId: req.user!.id, reference }).catch(() => null);
  if (!resolved) { res.status(404).json({ error: 'Source provider or source is unavailable' }); return; }
  res.json({ reference: resolved });
}

export async function resolveCampaignSourceOpenTarget(req: CampaignScopedRequest, res: Response): Promise<void> {
  const reference = referenceFromBody(req, res); if (!reference) return;
  const target = await resolveSourceOpenTarget({ campaignId: req.campaign!.campaignId, userId: req.user!.id, reference }).catch(() => null);
  if (!target) { res.status(404).json({ error: 'No safe open target is available' }); return; }
  res.json({ target });
}
