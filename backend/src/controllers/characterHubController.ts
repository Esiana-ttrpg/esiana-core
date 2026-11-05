import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { loadCharacterHubPayload } from '../lib/characterHubContext.js';
import { rejectUnverifiedAudiencePreview } from '../lib/adventureAudiencePreview.js';
import { canManageNotebooksFromActor, hasElevatedNarrativeView } from '../lib/acl.js';

export async function getCharacterHubIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (rejectUnverifiedAudiencePreview(req.query.previewAsPlayer,
    canManageNotebooksFromActor(ctx.actor) || hasElevatedNarrativeView(ctx.actor), res)) return;
  const categoryPageId = String(req.params.pageId);
  const previewAsPlayer =
    req.query.previewAsPlayer === 'true' || req.query.previewAsPlayer === '1';

  const payload = await loadCharacterHubPayload({
    campaignId: ctx.campaignId,
    campaignHandle: ctx.campaignHandle ?? '',
    categoryPageId,
    role: ctx.role ?? null,
    previewAsPlayer,
  });

  if (!payload) {
    res.status(404).json({ error: 'Characters category page not found' });
    return;
  }

  res.json(payload);
}
