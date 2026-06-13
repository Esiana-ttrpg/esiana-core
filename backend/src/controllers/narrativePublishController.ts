import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  previewQuestPublication,
  publishQuestToParty,
} from '../lib/narrativePublishService.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import type { CampaignMemberRole } from '../types/domain.js';

import { canManageNotebooksFromActor } from '../lib/acl.js';

export async function previewQuestPublish(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  try {
    const artifact = await previewQuestPublication(
      ctx.campaignId,
      pageId,
      ctx.role,
    );
    res.json({ preview: artifact });
  } catch (err) {
    if (err instanceof Error && err.message === 'PAGE_NOT_FOUND') {
      res.status(404).json({ error: 'Quest page not found' });
      return;
    }
    throw err;
  }
}

export async function publishQuest(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooksFromActor(ctx.actor);
  if (!canManage) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const actorUserId = req.user?.id;
  if (!actorUserId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const pageId = String(req.params.pageId);
  try {
    const result = await publishQuestToParty({
      campaignId: ctx.campaignId,
      questPageId: pageId,
      actorUserId,
      canManage,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'PAGE_NOT_FOUND') {
      res.status(404).json({ error: 'Quest page not found' });
      return;
    }
    throw err;
  }
}
