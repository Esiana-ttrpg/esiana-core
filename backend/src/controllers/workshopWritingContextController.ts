import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { getWorkshopDraft } from '../lib/workshopDraftService.js';

function countWikilinksInMarkdown(markdown: string): number {
  return (markdown.match(/\[\[[^\]]+\]\]/g) ?? []).length;
}

export async function getWorkshopWritingContextHandler(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const draftId = String(req.params.draftId);
  const draft = await getWorkshopDraft({
    campaignId: req.campaign!.campaignId,
    draftId,
    authorUserId: userId,
  });
  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }

  const hints: string[] = [];
  const linkCount = countWikilinksInMarkdown(draft.bodyMarkdown);
  if (linkCount > 0) {
    hints.push(`${linkCount} linked reference${linkCount === 1 ? '' : 's'} in this draft`);
  }

  const anchorId = draft.anchorEntityIds?.[0];
  if (anchorId) {
    const anchor = await prisma.wikiPage.findFirst({
      where: { id: anchorId, campaignId: req.campaign!.campaignId, deletedAt: null },
      select: { title: true },
    });
    if (anchor) {
      hints.push(`Continuing from ${anchor.title}`);
    }

    const inbound = await prisma.wikiLink.count({
      where: {
        campaignId: req.campaign!.campaignId,
        targetPageId: anchorId,
      },
    });
    if (inbound > 0) {
      hints.push(`Referenced by ${inbound} page${inbound === 1 ? '' : 's'}`);
    }
  }

  res.json({
    hints: hints.slice(0, 5),
    linkCount,
    unresolvedLinkCount: linkCount,
    anchorPageId: anchorId ?? null,
  });
}
