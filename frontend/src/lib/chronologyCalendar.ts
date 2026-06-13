import {
  formatOccurrenceDateLabel,
  nowFromCalendarState,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import {
  resolveMonthName,
  type FantasyCalendarLike,
} from '@/lib/timeEngine';
import type { FantasyCalendarApiRow } from '@/lib/timeTrackingApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';

export function calendarRowToLike(row: {
  epochOffset: string;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
}): FantasyCalendarLike {
  return {
    epochOffset: BigInt(row.epochOffset),
    weekdays: row.weekdays,
    months: row.months,
    seasons: row.seasons,
    moons: row.moons,
    leapDays: row.leapDays,
  };
}

export function resolveMasterCalendar(
  bundle: TimeTrackingBundle | null,
): FantasyCalendarApiRow | null {
  if (!bundle?.calendars?.length) return null;
  return (
    bundle.calendars.find((calendar) => calendar.isMasterTime) ??
    bundle.calendars[0] ??
    null
  );
}

export function resolveMasterCalendarLike(
  bundle: TimeTrackingBundle | null,
): FantasyCalendarLike | null {
  const row = resolveMasterCalendar(bundle);
  return row ? calendarRowToLike(row) : null;
}

export function defaultQuestDate(
  bundle: TimeTrackingBundle | null,
): ChronologyDateParts {
  const master = resolveMasterCalendar(bundle);
  if (master) {
    return nowFromCalendarState(master.state);
  }
  return { year: 1, month: 0, day: 1 };
}

export function formatQuestDateLabel(
  parts: QuestDateParts | null | undefined,
  calendarLike: FantasyCalendarLike,
): string | null {
  if (!parts) return null;
  if (parts.year === null && parts.month === null && parts.day === null) {
    return null;
  }
  const monthName =
    parts.year !== null && parts.month !== null
      ? resolveMonthName(calendarLike, parts.year, parts.month)
      : null;
  return formatOccurrenceDateLabel(parts, monthName);
}

export type QuestDateParts = ChronologyDateParts;
