import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  archiveScheduledEffect,
  canManageScheduledEffects,
  createScheduledEffect,
  listScheduledEffects,
  updateScheduledEffect,
} from '../lib/scheduledEffectService.js';
import { listScheduledEffectOccurrences } from '../lib/scheduledEffectOccurrenceService.js';
import {
  durationRecurrenceFromDays,
  durationRecurrenceFromWeeks,
  isTreasuryScheduledEffectKind,
  normalizeCalendarMonthRecurrence,
  normalizeDurationRecurrence,
  normalizeScheduledEffectKind,
  normalizeScheduledEffectListScope,
  type ScheduledEffectRecurrence,
} from '../../../shared/scheduledEffectMetadata.js';

function campaignHandleFromRequest(req: CampaignScopedRequest): string {
  return req.campaign!.campaignHandle ?? req.campaign!.campaignId;
}

function handleServiceError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Request failed.';
  if (message === 'Forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (message.includes('not found')) {
    res.status(404).json({ error: message });
    return;
  }
  res.status(400).json({ error: message });
}

function parseRecurrenceFromBody(body: Record<string, unknown>): ScheduledEffectRecurrence | null {
  if (body.recurrenceRule != null) {
    const duration = normalizeDurationRecurrence(body.recurrenceRule);
    if (duration) return duration;
    const calendarMonth = normalizeCalendarMonthRecurrence(body.recurrenceRule);
    if (calendarMonth) return calendarMonth;
    return null;
  }

  const preset = typeof body.recurrencePreset === 'string' ? body.recurrencePreset : '';
  switch (preset) {
    case 'weekly':
      return durationRecurrenceFromWeeks(1);
    case 'biweekly':
      return durationRecurrenceFromWeeks(2);
    case 'monthly_calendar': {
      const dayOfMonth =
        typeof body.dayOfMonth === 'number' ? body.dayOfMonth : 1;
      return normalizeCalendarMonthRecurrence({
        kind: 'calendar_month',
        dayOfMonth,
        monthInterval: 1,
      });
    }
    case 'every_7_days':
      return durationRecurrenceFromDays(7);
    case 'every_14_days':
      return durationRecurrenceFromDays(14);
    case 'every_30_days':
      return durationRecurrenceFromDays(30);
    default:
      return null;
  }
}

export async function listScheduledEffectsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = campaignHandleFromRequest(req);
  const includeArchived = req.query.includeArchived === 'true';
  const scope = normalizeScheduledEffectListScope(req.query.scope);

  try {
    const schedules = await listScheduledEffects(
      ctx.campaignId,
      campaignHandle,
      ctx.role,
      { includeArchived, scope },
    );
    res.json({ schedules });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function createScheduledEffectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!canManageScheduledEffects(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const effectKind = normalizeScheduledEffectKind(body.effectKind);
  if (!effectKind) {
    res.status(400).json({ error: 'Invalid effect kind.' });
    return;
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'Title is required.' });
    return;
  }

  const recurrenceRule = parseRecurrenceFromBody(body);
  if (!recurrenceRule) {
    res.status(400).json({ error: 'Invalid recurrence rule.' });
    return;
  }

  const amount =
    typeof body.amount === 'number' && Number.isFinite(body.amount)
      ? Math.floor(body.amount)
      : null;

  try {
    const schedule = await createScheduledEffect({
      campaignId: ctx.campaignId,
      effectKind,
      title,
      narrative: typeof body.narrative === 'string' ? body.narrative : null,
      recurrenceRule,
      havenWikiPageId:
        typeof body.havenWikiPageId === 'string' ? body.havenWikiPageId : null,
      primaryOrgPageId:
        typeof body.primaryOrgPageId === 'string' ? body.primaryOrgPageId : null,
      amount: isTreasuryScheduledEffectKind(effectKind) ? amount : null,
      createdByUserId: req.user.id,
    });
    res.status(201).json({ schedule });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function patchScheduledEffectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = campaignHandleFromRequest(req);
  const scheduleId = String(req.params.id);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const recurrenceRule =
    body.recurrenceRule != null ? parseRecurrenceFromBody(body) : undefined;
  if (body.recurrenceRule != null && !recurrenceRule) {
    res.status(400).json({ error: 'Invalid recurrence rule.' });
    return;
  }

  try {
    const schedule = await updateScheduledEffect(
      ctx.campaignId,
      campaignHandle,
      scheduleId,
      ctx.role,
      {
        status:
          body.status === 'active' || body.status === 'paused' || body.status === 'archived'
            ? body.status
            : undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
        narrative: body.narrative === null || typeof body.narrative === 'string'
          ? (body.narrative as string | null)
          : undefined,
        recurrenceRule: recurrenceRule ?? undefined,
        amount:
          typeof body.amount === 'number' && Number.isFinite(body.amount)
            ? Math.floor(body.amount)
            : undefined,
      },
    );
    res.json({ schedule });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function deleteScheduledEffectHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = campaignHandleFromRequest(req);
  const scheduleId = String(req.params.id);

  try {
    const schedule = await archiveScheduledEffect(
      ctx.campaignId,
      campaignHandle,
      scheduleId,
      ctx.role,
    );
    res.json({ schedule });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function listScheduledEffectOccurrencesHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageScheduledEffects(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const scheduleId = String(req.params.id);
  const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 10;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 10;

  try {
    const occurrences = await listScheduledEffectOccurrences(
      ctx.campaignId,
      scheduleId,
      limit,
    );
    res.json({ occurrences });
  } catch (err) {
    handleServiceError(res, err);
  }
}
