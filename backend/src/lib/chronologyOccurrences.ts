import {
  convertEpochToCalendarState,
  getMonthsForYear,
  parseLeapRules,
  parseMonths,
  resolveMonthName,
  type FantasyCalendarLike,
} from './timeEngine.js';

export type CalendarRowForResolve = {
  id: string;
  epochOffset: bigint;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
};

export type ResolvedEventCoordinates = {
  year: number | null;
  month: number | null;
  day: number | null;
  monthName: string | null;
  epochMinute: string | null;
};

export function calendarRowToLike(row: CalendarRowForResolve): FantasyCalendarLike {
  return {
    epochOffset: row.epochOffset,
    weekdays: row.weekdays,
    months: row.months,
    seasons: row.seasons,
    moons: row.moons,
    leapDays: row.leapDays,
  };
}

function hasExplicitTargetFields(event: {
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
}): boolean {
  return event.targetYear !== null || event.targetMonth !== null || event.targetDay !== null;
}

export function resolveEventStartCoordinates(
  event: {
    calendarId: string;
    targetYear: number | null;
    targetMonth: number | null;
    targetDay: number | null;
    targetEpochMinute: bigint | string | null;
  },
  calendarRow: CalendarRowForResolve | undefined,
  campaignEpochMinute: bigint | null,
): ResolvedEventCoordinates {
  if (!calendarRow) {
    return {
      year: event.targetYear,
      month: event.targetMonth,
      day: event.targetDay,
      monthName: null,
      epochMinute: event.targetEpochMinute?.toString() ?? null,
    };
  }

  const calendar = calendarRowToLike(calendarRow);

  if (event.targetEpochMinute !== null && event.targetEpochMinute !== undefined) {
    const epoch =
      typeof event.targetEpochMinute === 'bigint'
        ? event.targetEpochMinute
        : BigInt(event.targetEpochMinute);
    const state = convertEpochToCalendarState(epoch, calendar);
    return {
      year: state.year,
      month: state.monthIndex,
      day: state.day,
      monthName: state.monthName,
      epochMinute: epoch.toString(),
    };
  }

  if (hasExplicitTargetFields(event)) {
    const year = event.targetYear;
    const month = event.targetMonth;
    const day = event.targetDay;
    const monthName =
      year !== null && month !== null
        ? resolveMonthName(calendar, year, month)
        : null;
    return {
      year,
      month,
      day,
      monthName,
      epochMinute: null,
    };
  }

  if (campaignEpochMinute !== null) {
    const state = convertEpochToCalendarState(campaignEpochMinute, calendar);
    return {
      year: state.year,
      month: state.monthIndex,
      day: state.day,
      monthName: state.monthName,
      epochMinute: campaignEpochMinute.toString(),
    };
  }

  return {
    year: null,
    month: null,
    day: null,
    monthName: null,
    epochMinute: null,
  };
}

export function getMonthLengthsForYear(
  calendarRow: CalendarRowForResolve,
  year: number,
): number[] {
  const calendar = calendarRowToLike(calendarRow);
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);
  return getMonthsForYear(year, baseMonths, leapRules).map((month) => month.length);
}

/**
 * Advance a fantasy-calendar date by N days, rolling to day 1 at month boundary
 * and month 0 at year boundary (uses per-year month lengths from the calendar profile).
 */
export function advanceCalendarDate(
  calendarRow: CalendarRowForResolve | undefined,
  year: number | null,
  monthIndex: number | null,
  day: number | null,
  daysToAdd: number,
): ResolvedEventCoordinates {
  if (!calendarRow || year === null || monthIndex === null || day === null) {
    return {
      year: null,
      month: null,
      day: null,
      monthName: null,
      epochMinute: null,
    };
  }

  let nextYear = year;
  let nextMonth = monthIndex;
  let nextDay = day;
  const steps = Math.max(0, Math.floor(daysToAdd));

  for (let step = 0; step < steps; step += 1) {
    nextDay += 1;
    const monthLengths = getMonthLengthsForYear(calendarRow, nextYear);
    const monthCount = monthLengths.length;
    if (monthCount === 0) {
      break;
    }

    const monthLength = monthLengths[nextMonth] ?? 30;
    if (nextDay > monthLength) {
      nextDay = 1;
      nextMonth += 1;
      if (nextMonth >= monthCount) {
        nextMonth = 0;
        nextYear += 1;
      }
    }
  }

  const calendar = calendarRowToLike(calendarRow);
  return {
    year: nextYear,
    month: nextMonth,
    day: nextDay,
    monthName: resolveMonthName(calendar, nextYear, nextMonth),
    epochMinute: null,
  };
}
