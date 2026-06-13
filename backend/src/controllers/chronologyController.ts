import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageChronology } from '../lib/acl.js';
import { chronologyVisibilityFilter } from '../lib/chronologyVisibility.js';
import {
  advanceCalendarDate,
  getMonthLengthsForYear,
  resolveEventStartCoordinates,
  type CalendarRowForResolve,
} from '../lib/chronologyOccurrences.js';
import { getContentPresenceStateMap } from '../lib/contentPresenceService.js';
import { resolveCampaignChronologyNow } from '../lib/chronologyDefaults.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import {
  buildNarrativeViewerContext,
  isTimelineEventVisible,
  projectTimelineEventVisibility,
} from '../../../shared/narrativeProjection.js';
import { parseDomainsQuery } from '../../../shared/chronologyConvergence.js';
import { buildConvergenceOverlay } from '../lib/chronologyConvergenceService.js';

const MAX_GENERATED_PER_EVENT = 100;
const MAX_GENERATED_TOTAL = 2000;

function extractHashtags(value: string | null): string[] {
  if (!value) return [];
  const matches = value.match(/#[a-z0-9][a-z0-9-_]*/gi) ?? [];
  return Array.from(new Set(matches.map((tag) => tag.toLowerCase())));
}

type BaseEvent = {
  id: string;
  calendarId: string;
  categoryId: string | null;
  prerequisiteId: string | null;
  visibility: string;
  title: string;
  description: string | null;
  duration: number;
  isRepeating: boolean;
  repeatInterval: number | null;
  repeatUnit: string | null;
  limitRepetitions: number | null;
  conditions: unknown;
  moonOverrides: unknown;
  isRecurring: boolean;
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
  targetEpochMinute: bigint | null;
  recurrenceRule: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function addRepeatUnit(
  year: number | null,
  month: number | null,
  day: number | null,
  unit: string,
  interval: number,
  monthLengths: number[],
): { year: number | null; month: number | null; day: number | null; clipped: boolean } {
  if (year === null || month === null || day === null) {
    return { year, month, day, clipped: false };
  }
  let nextYear = year;
  let nextMonth = month;
  let nextDay = day;
  if (unit === 'DAYS') {
    nextDay += interval;
  } else if (unit === 'MONTHS') {
    nextMonth += interval;
  } else if (unit === 'YEARS' || unit === 'ERAS') {
    nextYear += interval;
  }
  while (nextMonth >= monthLengths.length && monthLengths.length > 0) {
    nextMonth -= monthLengths.length;
    nextYear += 1;
  }
  const monthLength = monthLengths[nextMonth] ?? 30;
  let clipped = false;
  if (nextDay > monthLength) {
    nextDay = monthLength;
    clipped = true;
  }
  return { year: nextYear, month: nextMonth, day: nextDay, clipped };
}

function buildOccurrences(
  baseEvents: BaseEvent[],
  calendarsById: Map<string, CalendarRowForResolve>,
  campaignEpochMinute: bigint | null,
) {
  const occurrences: Array<Record<string, unknown>> = [];
  const truncatedBaseEventIds: string[] = [];
  const warnings = new Set<string>();

  for (const event of baseEvents) {
    const calendarRow = calendarsById.get(event.calendarId);

    const limit = Math.min(event.limitRepetitions ?? MAX_GENERATED_PER_EVENT, MAX_GENERATED_PER_EVENT);
    if (event.limitRepetitions === null && event.isRepeating) {
      warnings.add('UNBOUNDED_RULE_FORCED_CAP');
    }

    let generatedForEvent = 0;
    const resolved = resolveEventStartCoordinates(event, calendarRow, campaignEpochMinute);
    let state = {
      year: resolved.year,
      month: resolved.month,
      day: resolved.day,
      monthName: resolved.monthName,
      epochMinute: resolved.epochMinute,
    };

    const maxIterations = event.isRepeating ? limit : 1;
    for (let i = 0; i < maxIterations; i += 1) {
      if (generatedForEvent >= MAX_GENERATED_PER_EVENT || occurrences.length >= MAX_GENERATED_TOTAL) {
        truncatedBaseEventIds.push(event.id);
        if (generatedForEvent >= MAX_GENERATED_PER_EVENT) warnings.add('CAP_APPLIED_PER_EVENT');
        if (occurrences.length >= MAX_GENERATED_TOTAL) warnings.add('CAP_APPLIED_TOTAL');
        break;
      }

      const duration = Math.max(1, event.duration ?? 1);
      const endCoords = advanceCalendarDate(
        calendarRow,
        state.year,
        state.month,
        state.day,
        duration - 1,
      );

      for (let dayOffset = 0; dayOffset < duration; dayOffset += 1) {
        if (occurrences.length >= MAX_GENERATED_TOTAL) {
          truncatedBaseEventIds.push(event.id);
          warnings.add('CAP_APPLIED_TOTAL');
          break;
        }

        const startCoords = advanceCalendarDate(
          calendarRow,
          state.year,
          state.month,
          state.day,
          dayOffset,
        );

        if (
          startCoords.year === null ||
          startCoords.month === null ||
          startCoords.day === null
        ) {
          warnings.add('CLIPPED_DAY_TO_MONTH_END');
          continue;
        }

        occurrences.push({
          occurrenceId: `occ_${event.id}_${i}_${dayOffset}`,
          baseEventId: event.id,
          occurrenceIndex: i,
          calendarId: event.calendarId,
          categoryId: event.categoryId,
          visibility: event.visibility,
          title: event.title,
          description: event.description,
          start: {
            year: startCoords.year,
            month: startCoords.month,
            day: startCoords.day,
            monthName: startCoords.monthName,
            epochMinute: state.epochMinute,
          },
          end: {
            year: endCoords.year,
            month: endCoords.month,
            day: endCoords.day,
            monthName: endCoords.monthName,
            epochMinute: state.epochMinute,
          },
          duration,
          isStart: dayOffset === 0,
          isContinuation: dayOffset > 0,
          dayOffset,
          sourceType: event.isRepeating ? 'REPEATING' : 'STATIC',
          prerequisiteBaseEventId: event.prerequisiteId,
        });
      }
      generatedForEvent += 1;

      if (!event.isRepeating || !event.repeatUnit || !event.repeatInterval) break;
      const monthLengths =
        calendarRow && state.year !== null
          ? getMonthLengthsForYear(calendarRow, state.year)
          : [];
      const next = addRepeatUnit(
        state.year,
        state.month,
        state.day,
        event.repeatUnit,
        event.repeatInterval,
        monthLengths,
      );
      if (next.clipped) warnings.add('CLIPPED_DAY_TO_MONTH_END');
      const nextMonthName =
        calendarRow && next.year !== null && next.month !== null
          ? resolveEventStartCoordinates(
              {
                calendarId: event.calendarId,
                targetYear: next.year,
                targetMonth: next.month,
                targetDay: next.day,
                targetEpochMinute: null,
              },
              calendarRow,
              null,
            ).monthName
          : state.monthName;
      state = {
        ...state,
        year: next.year,
        month: next.month,
        day: next.day,
        monthName: nextMonthName,
      };
    }
  }

  return {
    occurrences,
    warnings: Array.from(warnings),
    truncatedBaseEventIds: Array.from(new Set(truncatedBaseEventIds)),
  };
}

export async function getChronologyTimelineBundle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const canManage = canManageChronology(
    req.campaign?.role ?? null,
    req.campaign?.allowPlayerChronologyManagement ?? false,
  );

  const windowMode = String(req.query.windowMode ?? 'YEAR_RANGE');
  const from = String(req.query.from ?? '0');
  const to = String(req.query.to ?? '9999');

  const [campaign, calendars, categories, events] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    prisma.fantasyCalendar.findMany({
      where: { campaignId },
      orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        isMasterTime: true,
        epochOffset: true,
        weekdays: true,
        months: true,
        seasons: true,
        moons: true,
        leapDays: true,
      },
    }),
    prisma.calendarEventCategory.findMany({
      where: { campaignId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        campaignId: true,
        name: true,
        color: true,
      },
    }),
    prisma.calendarEvent.findMany({
      where: {
        calendar: { campaignId },
        ...chronologyVisibilityFilter(canManage),
      },
      orderBy: [
        { targetEpochMinute: 'asc' },
        { targetYear: 'asc' },
        { targetMonth: 'asc' },
        { targetDay: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        calendarId: true,
        categoryId: true,
        prerequisiteId: true,
        visibility: true,
        duration: true,
        isRepeating: true,
        repeatInterval: true,
        repeatUnit: true,
        limitRepetitions: true,
        conditions: true,
        moonOverrides: true,
        title: true,
        description: true,
        isRecurring: true,
        targetYear: true,
        targetMonth: true,
        targetDay: true,
        targetEpochMinute: true,
        recurrenceRule: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const chronologyPresenceState = await getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.TIMELINE_EVENT,
    events.map((event) => event.id),
  );
  const dateParts = await resolveCampaignChronologyNow(campaignId);
  const viewerCtx = buildNarrativeViewerContext({
    role: req.campaign?.role ?? null,
    campaignNow: {
      epochMinute: campaign?.currentEpochMinute ?? 0n,
      dateParts,
    },
    allowPlayerChronologyManagement:
      req.campaign?.allowPlayerChronologyManagement ?? false,
  });
  const visibleEvents = canManage
    ? events
    : events.filter((event) =>
        isTimelineEventVisible(
          projectTimelineEventVisibility(
            event.id,
            event.visibility,
            chronologyPresenceState,
            viewerCtx,
          ),
        ),
      );

  const baseEvents = visibleEvents.map((event) => ({
    ...event,
    targetEpochMinute: event.targetEpochMinute?.toString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    tags: Array.from(
      new Set([
        ...extractHashtags(event.title),
        ...extractHashtags(event.description),
      ]),
    ),
  }));

  const calendarsById = new Map<string, CalendarRowForResolve>(
    calendars.map((row) => [row.id, row]),
  );
  const campaignEpochMinute = campaign?.currentEpochMinute ?? null;
  const expanded = buildOccurrences(
    visibleEvents as BaseEvent[],
    calendarsById,
    campaignEpochMinute,
  );

  res.json({
    calendars: calendars.map(({ id, name, isMasterTime }) => ({
      id,
      name,
      isMasterTime,
    })),
    categories,
    baseEvents,
    occurrences: expanded.occurrences,
    events: expanded.occurrences,
    expansionMetadata: {
      window: {
        mode: windowMode,
        from,
        to,
      },
      limits: {
        maxGeneratedPerBaseEvent: MAX_GENERATED_PER_EVENT,
        maxGeneratedTotal: MAX_GENERATED_TOTAL,
      },
      generated: {
        totalOccurrences: expanded.occurrences.length,
        totalBaseEventsConsidered: visibleEvents.length,
        truncated: expanded.truncatedBaseEventIds.length > 0,
        truncatedBaseEventIds: expanded.truncatedBaseEventIds,
      },
      warnings: expanded.warnings,
      evaluationVersion: 'v1',
    },
  });
}

export async function getChronologyOverlayBundle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaignHandle =
    req.campaign!.campaignHandle ??
    String(req.params.campaignHandle ?? req.params.campaignId ?? '');
  const canManage = canManageChronology(
    req.campaign?.role ?? null,
    req.campaign?.allowPlayerChronologyManagement ?? false,
  );

  const windowMode = String(req.query.windowMode ?? 'YEAR_RANGE');
  const from = String(req.query.from ?? '0');
  const to = String(req.query.to ?? '9999');
  const sessionLinkedOnly = req.query.sessionLinkedOnly === 'true';
  const includeSuppressed =
    canManage && req.query.includeSuppressed === 'true';
  const domains = parseDomainsQuery(
    typeof req.query.domains === 'string' ? req.query.domains : undefined,
  );

  const bundle = await buildConvergenceOverlay({
    campaignId,
    campaignHandle,
    role: req.campaign?.role ?? null,
    allowPlayerChronologyManagement:
      req.campaign?.allowPlayerChronologyManagement ?? false,
    window: { mode: windowMode, from, to },
    domains,
    sessionLinkedOnly,
    includeSuppressed,
  });

  res.json(bundle);
}
