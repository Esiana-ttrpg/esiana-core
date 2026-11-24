import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { loadCharacterHubPayload } from '../lib/characterHubContext.js';
import { resolveAdventureAudience } from '../lib/adventureAudience.js';
import { canManageNotebooksFromActor, hasElevatedNarrativeView } from '../lib/acl.js';

export async function getCharacterHubIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const audience = resolveAdventureAudience(ctx, req.query.previewAsPlayer, null);
  const categoryPageId = String(req.params.pageId);

  const payload = await loadCharacterHubPayload({
    campaignId: ctx.campaignId,
    campaignHandle: ctx.campaignHandle ?? '',
    categoryPageId,
    role: ctx.role ?? null,
    previewAsPlayer: audience.preview,
    canManage: canManageNotebooksFromActor(ctx.actor),
    isElevated: hasElevatedNarrativeView(ctx.actor),
    canViewPage: audience.canViewPage,
  });

  if (!payload) {
    res.status(404).json({ error: 'Characters category page not found' });
    return;
  }

  res.json(payload);
}
