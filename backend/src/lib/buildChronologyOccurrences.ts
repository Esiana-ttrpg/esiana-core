import type { CampaignEra } from './prismaClient.js';
import { eraOccurrenceSchedule, type EraHistory } from './eraOccurrenceHistory.js';
import { convertEpochToCalendarState } from './timeEngine.js';
import { advanceCalendarDate, getMonthLengthsForYear, resolveEventStartCoordinates, type CalendarRowForResolve } from './chronologyOccurrences.js';

export const MAX_GENERATED_PER_EVENT = 100;
export const MAX_GENERATED_TOTAL = 2000;

export type BaseEvent = {
  id: string;
  calendarId: string;
  categoryId: string | null;
  prerequisiteId: string | null;
  visibility: string;
  importance: string;
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

export function buildOccurrences(
  baseEvents: BaseEvent[],
  calendarsById: Map<string, CalendarRowForResolve>,
  campaignEpochMinute: bigint | null,
  eras: CampaignEra[] = [],
  eraHistory: EraHistory = {},
  compact = false,
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
    if (compact && event.isRepeating && (event.limitRepetitions === null || event.limitRepetitions > MAX_GENERATED_PER_EVENT)) {
      warnings.add('CAP_APPLIED_PER_EVENT');
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

    const eraSchedule = event.isRepeating && event.repeatUnit === 'ERAS' && calendarRow
      ? eraOccurrenceSchedule(event, calendarRow, campaignEpochMinute, eras, eraHistory[event.id]) : null;
    const maxIterations = event.isRepeating ? limit : 1;
    for (let i = 0; i < maxIterations; i += 1) {
      if (eraSchedule && calendarRow) {
        const minute = eraSchedule[i];
        if (minute == null) continue;
        const date = convertEpochToCalendarState(minute, calendarRow);
        state = { year: date.year, month: date.monthIndex, day: date.day, monthName: date.monthName, epochMinute: minute.toString() };
      }
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

      for (let dayOffset = 0; dayOffset < (compact ? 1 : duration); dayOffset += 1) {
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
            importance: event.importance,
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
      if (eraSchedule) continue;
      const monthLengths =
        calendarRow && state.year !== null
          ? getMonthLengthsForYear(calendarRow, state.year)
          : [];
      const advanced = compact && event.repeatUnit === 'DAYS'
        ? advanceCalendarDate(calendarRow, state.year, state.month, state.day, event.repeatInterval) : null;
      const next = advanced && advanced.year !== null && advanced.month !== null && advanced.day !== null
        ? { year: advanced.year, month: advanced.month, day: advanced.day, clipped: false } : addRepeatUnit(
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
