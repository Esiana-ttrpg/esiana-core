import type { FantasyCalendar } from '@prisma/client';
import type { CalendarMonthRecurrence } from '../../../shared/scheduledEffectMetadata.js';
import {
  advanceCalendarByMonths,
  calendarEpochMinuteForDate,
  convertEpochToCalendarState,
  type FantasyCalendarLike,
} from './timeEngine.js';

function clampDayOfMonth(dayOfMonth: number): number {
  return Math.min(28, Math.max(1, Math.floor(dayOfMonth)));
}

/**
 * Next calendar-month fire strictly after `fromEpochMinute`.
 * Uses fantasy calendar projection — never months × average days.
 */
export function computeNextCalendarMonthFire(
  fromEpochMinute: bigint,
  rule: CalendarMonthRecurrence,
  calendar: FantasyCalendar | FantasyCalendarLike,
): bigint {
  const dayOfMonth = clampDayOfMonth(rule.dayOfMonth);
  const monthInterval = Math.max(1, Math.floor(rule.monthInterval ?? 1));
  const state = convertEpochToCalendarState(fromEpochMinute, calendar);

  let candidate = calendarEpochMinuteForDate(
    calendar,
    state.year,
    state.monthIndex,
    dayOfMonth,
  );
  const timeOfDay = fromEpochMinute - calendarEpochMinuteForDate(
    calendar,
    state.year,
    state.monthIndex,
    state.day,
  );
  candidate += timeOfDay;

  if (candidate <= fromEpochMinute) {
    const shifted = advanceCalendarByMonths(candidate, calendar, monthInterval);
    const nextState = shifted.nextCalendarState;
    candidate =
      calendarEpochMinuteForDate(
        calendar,
        nextState.year,
        nextState.monthIndex,
        dayOfMonth,
      ) + timeOfDay;
  }

  return candidate;
}

export function computeInitialCalendarMonthNextFire(
  anchorEpochMinute: bigint,
  rule: CalendarMonthRecurrence,
  calendar: FantasyCalendar | FantasyCalendarLike,
): bigint {
  const dayOfMonth = clampDayOfMonth(rule.dayOfMonth);
  const state = convertEpochToCalendarState(anchorEpochMinute, calendar);
  const timeOfDay =
    anchorEpochMinute -
    calendarEpochMinuteForDate(calendar, state.year, state.monthIndex, state.day);

  let candidate = calendarEpochMinuteForDate(
    calendar,
    state.year,
    state.monthIndex,
    dayOfMonth,
  );
  candidate += timeOfDay;

  if (candidate < anchorEpochMinute) {
    return computeNextCalendarMonthFire(anchorEpochMinute, rule, calendar);
  }

  return candidate;
}

export function computeCalendarMonthDueFires(input: {
  rule: CalendarMonthRecurrence;
  nextFireEpochMinute: bigint;
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
  maxFires: number;
  calendar: FantasyCalendar | FantasyCalendarLike;
}): { fires: bigint[]; remaining: boolean } {
  const fires: bigint[] = [];
  let cursor = input.nextFireEpochMinute;
  const monthInterval = Math.max(1, Math.floor(input.rule.monthInterval ?? 1));

  while (cursor <= input.nextEpochMinute && fires.length < input.maxFires) {
    if (cursor > input.previousEpochMinute) {
      fires.push(cursor);
    }
    const shifted = advanceCalendarByMonths(cursor, input.calendar, monthInterval);
    const dayOfMonth = clampDayOfMonth(input.rule.dayOfMonth);
    const timeOfDay =
      cursor -
      calendarEpochMinuteForDate(
        input.calendar,
        convertEpochToCalendarState(cursor, input.calendar).year,
        convertEpochToCalendarState(cursor, input.calendar).monthIndex,
        convertEpochToCalendarState(cursor, input.calendar).day,
      );
    cursor =
      calendarEpochMinuteForDate(
        input.calendar,
        shifted.nextCalendarState.year,
        shifted.nextCalendarState.monthIndex,
        dayOfMonth,
      ) + timeOfDay;
  }

  return { fires, remaining: cursor <= input.nextEpochMinute };
}
