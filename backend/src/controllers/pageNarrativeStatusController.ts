import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { buildNarrativeViewerContextFromRequest } from '../lib/narrativeProjectionContext.js';
import {
  buildPageNarrativeStatusProjectionMap,
  getPageNarrativeStatus,
  parsePageNarrativeStatusBody,
  projectStoredPageNarrativeStatus,
  resolveEffectivePageNarrativeStatus,
  upsertPageNarrativeStatus,
} from '../lib/pageNarrativeStatusService.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { prisma } from '../lib/prisma.js';
import { paramString } from '../lib/paramString.js';

function canManageWiki(role: CampaignMemberRole | null): boolean {
  return isElevatedWikiRole(role);
}

export async function getWikiPageNarrativeStatus(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = paramString(req.params.pageId);
  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to build viewer context' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId, deletedAt: null },
    select: { id: true, templateType: true, metadata: true },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const stored = await getPageNarrativeStatus(ctx.campaignId, pageId);
  const effective = resolveEffectivePageNarrativeStatus({
    stored,
    metadata: page.metadata,
  });
  const projection = projectStoredPageNarrativeStatus(
    stored,
    viewerCtx,
    effective,
  );

  res.json({
    narrativeStatus: projection,
    stored: stored
      ? { status: stored.status, reason: stored.reason }
      : null,
  });
}

export async function patchWikiPageNarrativeStatus(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const role = (ctx.role as CampaignMemberRole | null) ?? null;
  if (!canManageWiki(role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const pageId = paramString(req.params.pageId);
  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId, deletedAt: null },
    select: { id: true },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const parsed = parsePageNarrativeStatusBody(
    (req.body ?? {}) as Record<string, unknown>,
  );
  if (!parsed) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const stored = await upsertPageNarrativeStatus({
    campaignId: ctx.campaignId,
    wikiPageId: pageId,
    status: parsed.status,
    reason: parsed.reason,
    updatedByUserId: req.user?.id ?? null,
  });

  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to build viewer context' });
    return;
  }

  res.json({
    narrativeStatus: projectStoredPageNarrativeStatus(stored, viewerCtx),
  });
}

export async function batchWikiPageNarrativeStatus(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const idsRaw = typeof req.query.ids === 'string' ? req.query.ids : '';
  const pageIds = idsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (pageIds.length === 0) {
    res.status(400).json({ error: 'ids query param is required' });
    return;
  }

  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to build viewer context' });
    return;
  }

  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId: ctx.campaignId,
      id: { in: pageIds },
      deletedAt: null,
    },
    select: { id: true, templateType: true, metadata: true },
  });

  const projectionMap = await buildPageNarrativeStatusProjectionMap({
    campaignId: ctx.campaignId,
    pageIds: pages.map((p) => p.id),
    ctx: viewerCtx,
    pages,
  });

  const items: Record<string, ReturnType<typeof projectStoredPageNarrativeStatus>> =
    {};
  for (const [pageId, projection] of projectionMap) {
    items[pageId] = projection;
  }

  res.json({ items });
}
