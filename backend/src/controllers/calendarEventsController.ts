import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { canManageChronology } from '../lib/acl.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { chronologyVisibilityFilter } from '../lib/chronologyVisibility.js';
import { convertEpochToCalendarState } from '../lib/timeEngine.js';

const REPEAT_UNITS = ['DAYS', 'MONTHS', 'YEARS', 'ERAS'] as const;
type RepeatUnit = (typeof REPEAT_UNITS)[number];

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = toInt(value);
  if (parsed === null || parsed < 1) return null;
  return parsed;
}

function toBigIntString(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return BigInt(value.trim());
    } catch {
      return null;
    }
  }
  return null;
}

function serializeEvent(row: {
  id: string;
  calendarId: string;
  categoryId: string | null;
  prerequisiteId: string | null;
  visibility: string;
  duration: number;
  isRepeating: boolean;
  repeatInterval: number | null;
  repeatUnit: string | null;
  limitRepetitions: number | null;
  conditions: unknown;
  moonOverrides: unknown;
  title: string;
  description: string | null;
  isRecurring: boolean;
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
  targetEpochMinute: bigint | null;
  recurrenceRule: unknown;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    calendarId: row.calendarId,
    categoryId: row.categoryId,
    prerequisiteId: row.prerequisiteId,
    visibility: row.visibility,
    duration: row.duration,
    isRepeating: row.isRepeating,
    repeatInterval: row.repeatInterval,
    repeatUnit: row.repeatUnit,
    limitRepetitions: row.limitRepetitions,
    conditions: row.conditions,
    moonOverrides: row.moonOverrides,
    title: row.title,
    description: row.description,
    isRecurring: row.isRecurring,
    targetYear: row.targetYear,
    targetMonth: row.targetMonth,
    targetDay: row.targetDay,
    targetEpochMinute: row.targetEpochMinute?.toString() ?? null,
    recurrenceRule: row.recurrenceRule,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureCalendarInCampaign(campaignId: string, calendarId: string) {
  return prisma.fantasyCalendar.findFirst({
    where: { id: calendarId, campaignId },
    select: { id: true },
  });
}

function parseEventVisibility(value: unknown): 'PUBLIC' | 'PARTY' | 'DM_ONLY' | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'PUBLIC' || normalized === 'PARTY' || normalized === 'DM_ONLY') {
    return normalized;
  }
  return null;
}

function parseOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function ensureCategoryInCampaign(campaignId: string, categoryId: string) {
  return prisma.calendarEventCategory.findFirst({
    where: { id: categoryId, campaignId },
    select: { id: true },
  });
}

async function ensurePrerequisiteInCampaign(campaignId: string, prerequisiteId: string) {
  return prisma.calendarEvent.findFirst({
    where: { id: prerequisiteId, calendar: { campaignId } },
    select: { id: true },
  });
}

function parseRepeatUnit(value: unknown): RepeatUnit | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return (REPEAT_UNITS as readonly string[]).includes(normalized)
    ? (normalized as RepeatUnit)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidConditionTree(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.type === 'GROUP') {
    if (
      value.operator !== 'AND' &&
      value.operator !== 'OR' &&
      value.operator !== 'NAND' &&
      value.operator !== 'XOR'
    ) {
      return false;
    }
    if (!Array.isArray(value.children) || value.children.length === 0) return false;
    return value.children.every((child) => isValidConditionTree(child));
  }
  if (value.type === 'CRITERIA') {
    const parameter = value.parameter;
    const comparison = value.comparison;
    const hasValue = typeof value.value === 'string' && value.value.trim() !== '';
    const validParameter =
      parameter === 'YEAR' ||
      parameter === 'MONTH' ||
      parameter === 'DAY' ||
      parameter === 'WEEKDAY' ||
      parameter === 'MOON_PHASE' ||
      parameter === 'SEASON' ||
      parameter === 'CYCLE';
    const validComparison =
      comparison === 'EQUALS' ||
      comparison === 'NOT_EQUALS' ||
      comparison === 'GREATER_THAN' ||
      comparison === 'LESS_THAN' ||
      comparison === 'PHASE_MATCH';
    if (!validParameter || !validComparison || !hasValue) return false;
    if (parameter === 'MOON_PHASE') {
      return typeof value.moonId === 'string' && value.moonId.trim() !== '';
    }
    return value.moonId === undefined || value.moonId === null;
  }
  return false;
}

function parseJsonOrNull(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function listCalendarEvents(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const calendarId = String(req.params.calendarId ?? '');
  if (!calendarId) {
    res.status(400).json({ error: 'calendarId is required' });
    return;
  }

  const calendar = await ensureCalendarInCampaign(campaignId, calendarId);
  if (!calendar) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  const canManage = canManageChronology(
    req.campaign?.role ?? null,
    req.campaign?.allowPlayerChronologyManagement ?? false,
  );
  const events = await prisma.calendarEvent.findMany({
    where: {
      calendarId,
      ...chronologyVisibilityFilter(canManage),
    },
    orderBy: [
      { targetEpochMinute: 'asc' },
      { targetYear: 'asc' },
      { targetMonth: 'asc' },
      { targetDay: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  res.json({ events: events.map(serializeEvent) });
}

export async function createCalendarEvent(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const calendarId = String(req.params.calendarId ?? '');
  if (!calendarId) {
    res.status(400).json({ error: 'calendarId is required' });
    return;
  }

  const calendar = await ensureCalendarInCampaign(campaignId, calendarId);
  if (!calendar) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const categoryId = parseOptionalString(body.categoryId);
  if (body.categoryId !== undefined && body.categoryId !== null && categoryId === null) {
    res.status(400).json({ error: 'categoryId must be a non-empty string or null' });
    return;
  }
  if (categoryId) {
    const category = await ensureCategoryInCampaign(campaignId, categoryId);
    if (!category) {
      res.status(400).json({ error: 'categoryId must reference a category in this campaign' });
      return;
    }
  }

  const prerequisiteId = parseOptionalString(body.prerequisiteId);
  if (body.prerequisiteId !== undefined && body.prerequisiteId !== null && prerequisiteId === null) {
    res.status(400).json({ error: 'prerequisiteId must be a non-empty string or null' });
    return;
  }
  if (prerequisiteId) {
    const prerequisite = await ensurePrerequisiteInCampaign(campaignId, prerequisiteId);
    if (!prerequisite) {
      res.status(400).json({ error: 'prerequisiteId must reference an event in this campaign' });
      return;
    }
  }

  const visibility = parseEventVisibility(body.visibility);
  if (body.visibility !== undefined && visibility === null) {
    res.status(400).json({ error: 'visibility must be PUBLIC, PARTY, or DM_ONLY' });
    return;
  }

  const duration = body.duration === undefined ? 1 : parsePositiveInt(body.duration);
  if (duration === null) {
    res.status(400).json({ error: 'duration must be an integer >= 1' });
    return;
  }

  const isRepeating = body.isRepeating === undefined ? false : Boolean(body.isRepeating);
  const repeatInterval =
    body.repeatInterval === undefined || body.repeatInterval === null
      ? null
      : parsePositiveInt(body.repeatInterval);
  if (
    body.repeatInterval !== undefined &&
    body.repeatInterval !== null &&
    repeatInterval === null
  ) {
    res.status(400).json({ error: 'repeatInterval must be an integer >= 1' });
    return;
  }
  const repeatUnit = parseRepeatUnit(body.repeatUnit);
  if (body.repeatUnit !== undefined && body.repeatUnit !== null && repeatUnit === null) {
    res.status(400).json({ error: 'repeatUnit must be DAYS, MONTHS, YEARS, or ERAS' });
    return;
  }
  const limitRepetitions =
    body.limitRepetitions === undefined || body.limitRepetitions === null
      ? null
      : parsePositiveInt(body.limitRepetitions);
  if (
    body.limitRepetitions !== undefined &&
    body.limitRepetitions !== null &&
    limitRepetitions === null
  ) {
    res.status(400).json({ error: 'limitRepetitions must be an integer >= 1' });
    return;
  }
  if (isRepeating && (repeatInterval === null || repeatUnit === null)) {
    res.status(400).json({ error: 'repeatInterval and repeatUnit are required when isRepeating is true' });
    return;
  }
  if (body.conditions !== undefined && body.conditions !== null && !isValidConditionTree(body.conditions)) {
    res.status(400).json({ error: 'conditions must be a valid ConditionNode tree' });
    return;
  }

  let targetEpochMinute =
    body.targetEpochMinute === undefined || body.targetEpochMinute === null
      ? null
      : toBigIntString(body.targetEpochMinute);
  if (body.targetEpochMinute !== undefined && body.targetEpochMinute !== null && targetEpochMinute === null) {
    res.status(400).json({ error: 'targetEpochMinute must be a valid integer string/number' });
    return;
  }

  let targetYear = toInt(body.targetYear);
  let targetMonth = toInt(body.targetMonth);
  let targetDay = toInt(body.targetDay);

  const hasExplicitTargetInput =
    body.targetYear !== undefined ||
    body.targetMonth !== undefined ||
    body.targetDay !== undefined ||
    (body.targetEpochMinute !== undefined && body.targetEpochMinute !== null);

  if (!hasExplicitTargetInput && targetEpochMinute === null) {
    const [campaign, calendarFull] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { currentEpochMinute: true },
      }),
      prisma.fantasyCalendar.findFirst({
        where: { id: calendarId, campaignId },
        select: {
          epochOffset: true,
          weekdays: true,
          months: true,
          seasons: true,
          moons: true,
          leapDays: true,
        },
      }),
    ]);

    if (campaign && calendarFull) {
      const state = convertEpochToCalendarState(campaign.currentEpochMinute, {
        epochOffset: calendarFull.epochOffset,
        weekdays: calendarFull.weekdays,
        months: calendarFull.months,
        seasons: calendarFull.seasons,
        moons: calendarFull.moons,
        leapDays: calendarFull.leapDays,
      });
      targetYear = state.year;
      targetMonth = state.monthIndex;
      targetDay = state.day;
      targetEpochMinute = campaign.currentEpochMinute;
    }
  }

  const recurrenceRule =
    body.recurrenceRule === undefined || body.recurrenceRule === null
      ? Prisma.JsonNull
      : (body.recurrenceRule as Prisma.InputJsonValue);

  const created = await prisma.$transaction(async (tx) => {
    const event = await tx.calendarEvent.create({
      data: {
        calendarId,
        categoryId,
        prerequisiteId,
        visibility: visibility ?? 'PARTY',
        duration,
        isRepeating,
        repeatInterval,
        repeatUnit,
        limitRepetitions,
        conditions: parseJsonOrNull(body.conditions),
        moonOverrides: parseJsonOrNull(body.moonOverrides),
        title,
        description:
          typeof body.description === 'string' && body.description.trim()
            ? body.description.trim()
            : null,
        isRecurring: Boolean(body.isRecurring),
        targetYear,
        targetMonth,
        targetDay,
        targetEpochMinute,
        recurrenceRule,
      },
    });
    const { syncEntityRelationsForCalendarEvent } = await import(
      '../lib/entityRelationSyncService.js'
    );
    await syncEntityRelationsForCalendarEvent(tx, campaignId, event.id);
    return event;
  });

  res.status(201).json({ event: serializeEvent(created) });
}

export async function updateCalendarEvent(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const calendarId = String(req.params.calendarId ?? '');
  const eventId = String(req.params.eventId ?? '');
  if (!calendarId || !eventId) {
    res.status(400).json({ error: 'calendarId and eventId are required' });
    return;
  }

  const calendar = await ensureCalendarInCampaign(campaignId, calendarId);
  if (!calendar) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, calendarId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : existing.title;

  const categoryId =
    body.categoryId === undefined
      ? existing.categoryId
      : body.categoryId === null
        ? null
        : parseOptionalString(body.categoryId);
  if (body.categoryId !== undefined && body.categoryId !== null && categoryId === null) {
    res.status(400).json({ error: 'categoryId must be a non-empty string or null' });
    return;
  }
  if (categoryId) {
    const category = await ensureCategoryInCampaign(campaignId, categoryId);
    if (!category) {
      res.status(400).json({ error: 'categoryId must reference a category in this campaign' });
      return;
    }
  }

  const prerequisiteId =
    body.prerequisiteId === undefined
      ? existing.prerequisiteId
      : body.prerequisiteId === null
        ? null
        : parseOptionalString(body.prerequisiteId);
  if (body.prerequisiteId !== undefined && body.prerequisiteId !== null && prerequisiteId === null) {
    res.status(400).json({ error: 'prerequisiteId must be a non-empty string or null' });
    return;
  }
  if (prerequisiteId === eventId) {
    res.status(400).json({ error: 'prerequisiteId cannot reference the same event' });
    return;
  }
  if (prerequisiteId) {
    const prerequisite = await ensurePrerequisiteInCampaign(campaignId, prerequisiteId);
    if (!prerequisite) {
      res.status(400).json({ error: 'prerequisiteId must reference an event in this campaign' });
      return;
    }
  }

  const parsedVisibility =
    body.visibility === undefined ? existing.visibility : parseEventVisibility(body.visibility);
  if (body.visibility !== undefined && parsedVisibility === null) {
    res.status(400).json({ error: 'visibility must be PUBLIC, PARTY, or DM_ONLY' });
    return;
  }

  const duration =
    body.duration === undefined ? existing.duration : parsePositiveInt(body.duration);
  if (duration === null) {
    res.status(400).json({ error: 'duration must be an integer >= 1' });
    return;
  }
  const isRepeating =
    body.isRepeating === undefined ? existing.isRepeating : Boolean(body.isRepeating);
  const repeatInterval =
    body.repeatInterval === undefined
      ? existing.repeatInterval
      : body.repeatInterval === null
        ? null
        : parsePositiveInt(body.repeatInterval);
  if (
    body.repeatInterval !== undefined &&
    body.repeatInterval !== null &&
    repeatInterval === null
  ) {
    res.status(400).json({ error: 'repeatInterval must be an integer >= 1' });
    return;
  }
  const repeatUnit =
    body.repeatUnit === undefined ? existing.repeatUnit : parseRepeatUnit(body.repeatUnit);
  if (body.repeatUnit !== undefined && body.repeatUnit !== null && repeatUnit === null) {
    res.status(400).json({ error: 'repeatUnit must be DAYS, MONTHS, YEARS, or ERAS' });
    return;
  }
  const limitRepetitions =
    body.limitRepetitions === undefined
      ? existing.limitRepetitions
      : body.limitRepetitions === null
        ? null
        : parsePositiveInt(body.limitRepetitions);
  if (
    body.limitRepetitions !== undefined &&
    body.limitRepetitions !== null &&
    limitRepetitions === null
  ) {
    res.status(400).json({ error: 'limitRepetitions must be an integer >= 1' });
    return;
  }
  if (isRepeating && (repeatInterval === null || repeatUnit === null)) {
    res.status(400).json({ error: 'repeatInterval and repeatUnit are required when isRepeating is true' });
    return;
  }
  if (body.conditions !== undefined && body.conditions !== null && !isValidConditionTree(body.conditions)) {
    res.status(400).json({ error: 'conditions must be a valid ConditionNode tree' });
    return;
  }

  const targetEpochMinute =
    body.targetEpochMinute === undefined
      ? existing.targetEpochMinute
      : body.targetEpochMinute === null
        ? null
        : toBigIntString(body.targetEpochMinute);

  if (body.targetEpochMinute !== undefined && body.targetEpochMinute !== null && targetEpochMinute === null) {
    res.status(400).json({ error: 'targetEpochMinute must be a valid integer string/number' });
    return;
  }

  const recurrenceRule: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
    body.recurrenceRule === undefined
      ? existing.recurrenceRule === null
        ? Prisma.JsonNull
        : (existing.recurrenceRule as Prisma.InputJsonValue)
      : body.recurrenceRule === null
        ? Prisma.JsonNull
        : (body.recurrenceRule as Prisma.InputJsonValue);

  const updated = await prisma.$transaction(async (tx) => {
    const event = await tx.calendarEvent.update({
      where: { id: eventId },
      data: {
        title,
        categoryId,
        prerequisiteId,
        visibility: parsedVisibility ?? existing.visibility,
        duration,
        isRepeating,
        repeatInterval,
        repeatUnit,
        limitRepetitions,
        conditions:
          body.conditions === undefined
            ? existing.conditions === null
              ? Prisma.JsonNull
              : (existing.conditions as Prisma.InputJsonValue)
            : parseJsonOrNull(body.conditions),
        moonOverrides:
          body.moonOverrides === undefined
            ? existing.moonOverrides === null
              ? Prisma.JsonNull
              : (existing.moonOverrides as Prisma.InputJsonValue)
            : parseJsonOrNull(body.moonOverrides),
        description:
          body.description === undefined
            ? existing.description
            : typeof body.description === 'string' && body.description.trim()
              ? body.description.trim()
              : null,
        isRecurring:
          body.isRecurring === undefined ? existing.isRecurring : Boolean(body.isRecurring),
        targetYear: body.targetYear === undefined ? existing.targetYear : toInt(body.targetYear),
        targetMonth:
          body.targetMonth === undefined ? existing.targetMonth : toInt(body.targetMonth),
        targetDay: body.targetDay === undefined ? existing.targetDay : toInt(body.targetDay),
        targetEpochMinute,
        recurrenceRule,
      },
    });
    const { syncEntityRelationsForCalendarEvent } = await import(
      '../lib/entityRelationSyncService.js'
    );
    await syncEntityRelationsForCalendarEvent(tx, campaignId, event.id);
    return event;
  });

  res.json({ event: serializeEvent(updated) });
}

export async function deleteCalendarEvent(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const calendarId = String(req.params.calendarId ?? '');
  const eventId = String(req.params.eventId ?? '');
  if (!calendarId || !eventId) {
    res.status(400).json({ error: 'calendarId and eventId are required' });
    return;
  }

  const calendar = await ensureCalendarInCampaign(campaignId, calendarId);
  if (!calendar) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, calendarId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const { clearEntityRelationsForCalendarEvent } = await import(
      '../lib/entityRelationSyncService.js'
    );
    await clearEntityRelationsForCalendarEvent(tx, campaignId, eventId);
    await tx.calendarEvent.delete({ where: { id: eventId } });
  });
  res.json({ ok: true });
}
