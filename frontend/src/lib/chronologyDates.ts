import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';
import type { ChronologyDateParts } from '@shared/chronologyTypes';
import {
  getMonthsForYear,
  parseLeapRules,
  parseMonths,
  type CalendarState,
  type FantasyCalendarLike,
} from './timeEngine.js';

export type { ChronologyDateParts };

export function dateSeedDiffersFromAnchor(
  dateSeed: ChronologyDateParts | null | undefined,
  baseEvent: {
    targetYear: number | null;
    targetMonth: number | null;
    targetDay: number | null;
  },
): boolean {
  if (!dateSeed) return false;
  if (dateSeed.year === null || dateSeed.month === null || dateSeed.day === null) {
    return false;
  }
  return (
    dateSeed.year !== baseEvent.targetYear ||
    dateSeed.month !== baseEvent.targetMonth ||
    dateSeed.day !== baseEvent.targetDay
  );
}

export function nowFromCalendarState(state: CalendarState): ChronologyDateParts {
  return {
    year: state.year,
    month: state.monthIndex,
    day: state.day,
  };
}

export function compareDateParts(a: ChronologyDateParts, b: ChronologyDateParts): number {
  const ay = a.year ?? Number.NEGATIVE_INFINITY;
  const by = b.year ?? Number.NEGATIVE_INFINITY;
  if (ay !== by) return ay < by ? -1 : 1;

  const am = a.month ?? -1;
  const bm = b.month ?? -1;
  if (am !== bm) return am < bm ? -1 : 1;

  const ad = a.day ?? -1;
  const bd = b.day ?? -1;
  if (ad !== bd) return ad < bd ? -1 : 1;

  return 0;
}

export function dateSortKey(parts: ChronologyDateParts): number {
  const year = parts.year ?? 0;
  const month = parts.month ?? 0;
  const day = parts.day ?? 0;
  return year * 10000 + month * 100 + day;
}

export function isBeforeNow(parts: ChronologyDateParts, now: ChronologyDateParts): boolean {
  return compareDateParts(parts, now) < 0;
}

export function isAfterNow(parts: ChronologyDateParts, now: ChronologyDateParts): boolean {
  return compareDateParts(parts, now) > 0;
}

export function isCurrentMonth(parts: ChronologyDateParts, now: ChronologyDateParts): boolean {
  return parts.year === now.year && parts.month === now.month;
}

export function formatMonthSeparator(parts: ChronologyDateParts): string {
  const year = parts.year ?? '—';
  const month = parts.month !== null ? parts.month + 1 : '—';
  return `Year ${year} · Month ${month}`;
}

export function formatMonthSeparatorWithName(
  parts: ChronologyDateParts,
  monthName?: string | null,
): string {
  const year = parts.year ?? '—';
  if (monthName?.trim()) {
    return `Year ${year} · ${monthName.trim()}`;
  }
  return formatMonthSeparator(parts);
}

export function formatOccurrenceDateLabel(
  start: ChronologyDateParts & { monthName?: string | null },
  monthName?: string | null,
): string {
  const year = start.year ?? '—';
  const resolvedName =
    monthName?.trim() || start.monthName?.trim() || null;
  const day = start.day ?? '—';
  if (resolvedName) {
    return `Yr ${year} · ${resolvedName} ${day}`;
  }
  const month = start.month !== null ? start.month + 1 : '—';
  return `Yr ${year} · Month ${month} ${day}`;
}

export function findClosestEventIndex(
  events: TimelineOccurrenceRecord[],
  now: ChronologyDateParts,
): number {
  if (events.length === 0) return -1;

  const nowKey = dateSortKey(now);
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < events.length; i += 1) {
    const eventKey = dateSortKey(events[i].start);
    const distance = Math.abs(eventKey - nowKey);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function sortOccurrencesByDate(
  events: TimelineOccurrenceRecord[],
): TimelineOccurrenceRecord[] {
  return [...events].sort((a, b) => compareDateParts(a.start, b.start));
}

/** Coerce year/month/day to fit a calendar profile (month index before day). */
export function clampChronologyDate(
  calendar: FantasyCalendarLike,
  parts: ChronologyDateParts,
): ChronologyDateParts {
  const year = Math.max(1, Math.floor(parts.year ?? 1));
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);
  const yearMonths = getMonthsForYear(year, baseMonths, leapRules);

  if (yearMonths.length === 0) {
    return { year, month: 0, day: 1 };
  }

  const month = Math.min(Math.max(0, parts.month ?? 0), yearMonths.length - 1);
  const monthLength = yearMonths[month]?.length ?? 1;
  const day = Math.min(Math.max(1, parts.day ?? 1), monthLength);

  return { year, month, day };
}

/** Advance by N days with month/year rollover (fantasy month lengths). */
export function advanceChronologyDateByDays(
  calendar: FantasyCalendarLike,
  parts: ChronologyDateParts,
  daysToAdd: number,
): ChronologyDateParts {
  const start = clampChronologyDate(calendar, parts);
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);

  let year = start.year ?? 1;
  let month = start.month ?? 0;
  let day = start.day ?? 1;
  const steps = Math.max(0, Math.floor(daysToAdd));

  for (let step = 0; step < steps; step += 1) {
    day += 1;
    const yearMonths = getMonthsForYear(year, baseMonths, leapRules);
    const monthCount = yearMonths.length;
    if (monthCount === 0) {
      break;
    }

    const monthLength = yearMonths[month]?.length ?? 30;
    if (day > monthLength) {
      day = 1;
      month += 1;
      if (month >= monthCount) {
        month = 0;
        year += 1;
      }
    }
  }

  return clampChronologyDate(calendar, { year, month, day });
}

/** Retreat by N days with month/year rollover. */
export function retreatChronologyDateByDays(
  calendar: FantasyCalendarLike,
  parts: ChronologyDateParts,
  daysToSubtract: number,
): ChronologyDateParts {
  const start = clampChronologyDate(calendar, parts);
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);

  let year = start.year ?? 1;
  let month = start.month ?? 0;
  let day = start.day ?? 1;
  const steps = Math.max(0, Math.floor(daysToSubtract));

  for (let step = 0; step < steps; step += 1) {
    day -= 1;
    if (day >= 1) {
      continue;
    }

    month -= 1;
    if (month < 0) {
      year = Math.max(1, year - 1);
      const priorYearMonths = getMonthsForYear(year, baseMonths, leapRules);
      month = Math.max(0, priorYearMonths.length - 1);
      day = priorYearMonths[month]?.length ?? 1;
    } else {
      const yearMonths = getMonthsForYear(year, baseMonths, leapRules);
      day = yearMonths[month]?.length ?? 1;
    }
  }

  return clampChronologyDate(calendar, { year, month, day });
}
