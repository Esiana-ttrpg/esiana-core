import { visibleChronologyPageIds } from '../lib/chronologyPageAccess.js';
import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { CampaignContext } from '../types/api.js';
import type { Prisma } from '../lib/prismaClient.js';
import { prisma } from '../lib/prisma.js';
import { chronologyCanManage, chronologyCanView } from '../lib/chronologyAccess.js';
import { canViewWikiPage } from '../lib/wikiTree.js';
import { EraError } from '../lib/chronologyEraService.js';

export async function linkChronologyPage(db: Prisma.TransactionClient, ctx: CampaignContext,
  type: string, id: string, pageId: string | null, initialize = false, authorizedPreviousPageIds?: ReadonlySet<string>) {
  if (!chronologyCanManage(ctx)) throw new EraError('Chronology management is not permitted.', 403);
  await db.campaign.update({ where: { id: ctx.campaignId }, data: { updatedAt: new Date() } });
  if (type !== 'events' && type !== 'eras') throw new EraError('Unknown chronology record.', 404);
  const record = type === 'events'
    ? await db.calendarEvent.findFirst({ where: { id, calendar: { campaignId: ctx.campaignId } } })
    : await db.campaignEra.findUnique({ where: { campaignId_id: { campaignId: ctx.campaignId, id } } });
  if (!record || !chronologyCanView(ctx, record.visibility)) throw new EraError('Chronology record not found.', 404);
  const previousId = 'wikiPageId' in record ? record.wikiPageId : record.overviewPageId;
  const previous = previousId ? await db.wikiPage.findFirst({ where: { id: previousId, campaignId: ctx.campaignId, deletedAt: null } }) : null;
  if (initialize && previous) throw new EraError('A page is already linked. Reload the chronology record.', 409);
  // Preserve operational consequences when a legacy authored page is detached.
  if (type === 'events' && previous && (!authorizedPreviousPageIds || authorizedPreviousPageIds.has(previous.id)) && canViewWikiPage(previous.visibility, ctx.role) && previous.metadata && typeof previous.metadata === 'object' && !Array.isArray(previous.metadata) && 'eventConsequences' in previous.metadata) {
    const metadata = 'metadata' in record && record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata) ? record.metadata : {};
    if (!Object.prototype.hasOwnProperty.call(metadata, 'eventConsequences')) {
      await db.calendarEvent.update({ where: { id }, data: { metadata: { ...metadata, eventConsequences: previous.metadata.eventConsequences } as Prisma.InputJsonValue } });
    }
  }
  if (type === 'eras' && pageId && await db.campaignEra.findFirst({ where: { campaignId: ctx.campaignId, overviewPageId: pageId, id: { not: id } } })) throw new EraError('This page is already linked to an era.', 409);
  if (pageId) {
    const page = await db.wikiPage.findFirst({ where: { id: pageId, campaignId: ctx.campaignId, deletedAt: null } });
    if (!page || !canViewWikiPage(page.visibility, ctx.role)) throw new EraError('Page not found.', 404);
    if (initialize) await db.wikiPage.update({ where: { id: page.id }, data: { visibility: record.visibility === 'DM_ONLY' ? 'DM_Only' : record.visibility === 'PUBLIC' ? 'Public' : 'Party' } });
  }
  if (type === 'events') await db.calendarEvent.update({ where: { id }, data: { wikiPageId: pageId } });
  else await db.campaignEra.update({ where: { campaignId_id: { campaignId: ctx.campaignId, id } }, data: { overviewPageId: pageId } });
}

export async function setChronologyPage(req: CampaignScopedRequest, res: Response) {
  const pageId = req.body?.pageId;
  if (pageId !== null && (typeof pageId !== 'string' || !pageId.trim())) {
    res.status(400).json({ error: 'Choose a page or unlink it.' }); return;
  }
  try {
    const ctx = req.campaign!;
    const event = req.params.entityType === 'events' ? await prisma.calendarEvent.findFirst({ where: { id: String(req.params.entityId), calendar: { campaignId: ctx.campaignId } }, select: { wikiPageId: true } }) : null;
    const previous = event?.wikiPageId ? await prisma.wikiPage.findFirst({ where: { id: event.wikiPageId, campaignId: ctx.campaignId, deletedAt: null }, select: { id: true, visibility: true } }) : null;
    const authorizedPrevious = await visibleChronologyPageIds(ctx, previous ? [previous] : []);
    await prisma.$transaction(async db => {
      await linkChronologyPage(db, req.campaign!, String(req.params.entityType), String(req.params.entityId), pageId, false, authorizedPrevious);
    });
    res.json({ pageId });
  } catch (error) {
    if (error instanceof EraError) res.status(error.status).json({ error: error.message });
    else throw error;
  }
}
