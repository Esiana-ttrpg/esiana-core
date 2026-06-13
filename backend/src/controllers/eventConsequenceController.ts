import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageChronology } from '../lib/acl.js';
import {
  dedupeEventConsequencesById,
  parseEventConsequenceSet,
} from '../../../shared/eventConsequence.js';
import { applyEventConsequencesStandalone } from '../lib/eventConsequenceService.js';
import {
  loadEventConsequencesForCalendarEvent,
  saveEventConsequences,
} from '../lib/eventConsequenceStore.js';
import { prisma } from '../lib/prisma.js';

async function ensureCalendarEventInCampaign(campaignId: string, eventId: string) {
  return prisma.calendarEvent.findFirst({
    where: { id: eventId, calendar: { campaignId } },
    select: { id: true, title: true, calendarId: true },
  });
}

function parsePreviewOnly(req: CampaignScopedRequest): boolean {
  const query = req.query.previewOnly;
  if (query === 'true' || query === '1') return true;
  const body = req.body as Record<string, unknown> | undefined;
  return body?.previewOnly === true;
}

export async function getEventConsequences(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const eventId = String(req.params.eventId ?? '');
  if (!eventId) {
    res.status(400).json({ error: 'eventId required' });
    return;
  }

  const event = await ensureCalendarEventInCampaign(campaignId, eventId);
  if (!event) {
    res.status(404).json({ error: 'Calendar event not found' });
    return;
  }

  const loaded = await loadEventConsequencesForCalendarEvent(prisma, campaignId, eventId);
  res.json({
    eventId,
    lorePageId: loaded.lorePageId,
    consequences: loaded.consequences,
  });
}

export async function putEventConsequences(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (
    !canManageChronology(
      ctx.role,
      ctx.allowPlayerChronologyManagement ?? false,
    )
  ) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const actorUserId = req.user?.id;
  if (!actorUserId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const eventId = String(req.params.eventId ?? '');
  const event = await ensureCalendarEventInCampaign(ctx.campaignId, eventId);
  if (!event) {
    res.status(404).json({ error: 'Calendar event not found' });
    return;
  }

  const body = req.body as { consequences?: unknown };
  const parsed = parseEventConsequenceSet({
    version: 'event-consequence-v1',
    consequences: body.consequences,
  });
  if (!parsed) {
    res.status(400).json({ error: 'Invalid consequences payload' });
    return;
  }

  const consequences = dedupeEventConsequencesById(parsed.consequences);

  const saved = await prisma.$transaction((tx) =>
    saveEventConsequences(tx, {
      campaignId: ctx.campaignId,
      calendarEventId: eventId,
      consequences,
      actorUserId,
      calendarEventTitle: event.title,
    }),
  );

  res.json({
    eventId,
    lorePageId: `event-${eventId}`,
    consequences: saved,
  });
}

export async function postApplyEventConsequences(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (
    !canManageChronology(
      ctx.role,
      ctx.allowPlayerChronologyManagement ?? false,
    )
  ) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const actorUserId = req.user?.id;
  if (!actorUserId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const eventId = String(req.params.eventId ?? '');
  const event = await ensureCalendarEventInCampaign(ctx.campaignId, eventId);
  if (!event) {
    res.status(404).json({ error: 'Calendar event not found' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: ctx.campaignId },
    select: { currentEpochMinute: true },
  });
  const atEpochMinute = campaign?.currentEpochMinute?.toString() ?? '0';
  const previewOnly = parsePreviewOnly(req);

  const result = await applyEventConsequencesStandalone({
    campaignId: ctx.campaignId,
    calendarEventId: eventId,
    actorUserId,
    atEpochMinute,
    previewOnly,
  });

  res.json(result);
}
