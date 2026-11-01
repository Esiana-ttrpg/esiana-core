import type { TimelineOccurrenceRecord } from './chronologyApi';
import {
  calendarEpochMinuteForDate,
  convertEpochToCalendarState,
  getMonthsForYear,
  parseLeapRules,
  parseMonths,
  type CalendarState,
  type FantasyCalendarLike,
} from './timeEngine';
import type { ClimateAspect } from './climateAspect';

export function eventDayState(
  event: Pick<TimelineOccurrenceRecord, 'duration' | 'dayOffset'>,
) {
  if (event.duration === 1) return 'Single-day event';
  if (event.dayOffset === 0) return 'Event begins';
  if (event.dayOffset === event.duration - 1) return 'Event ends';
  return 'Event continues';
}

export function compareCalendarEvents(
  a: TimelineOccurrenceRecord,
  b: TimelineOccurrenceRecord,
) {
  const rank = { MAJOR: 0, MINOR: 1, NOTICE: 2 };
  return (
    rank[a.importance ?? 'MINOR'] - rank[b.importance ?? 'MINOR'] ||
    a.title.localeCompare(b.title) ||
    a.occurrenceId.localeCompare(b.occurrenceId)
  );
}

export const CLIMATE_LABELS: Record<ClimateAspect, string> = {
  ARID: 'Arid / Searing',
  PLUVIAL: 'Pluvial / Monsoon',
  CRYORIC: 'Cryoric / Glacial',
  TEMPEST: 'Tempest / Storm',
  OVERGROWTH: 'Overgrowth / Decay',
  NEUTRAL: 'Temperate / Fair',
};

export const MOON_SYMBOLS: Record<string, string> = {
  new: '🌑',
  'waxing crescent': '🌒',
  'first quarter': '🌓',
  'waxing gibbous': '🌔',
  full: '🌕',
  'waning gibbous': '🌖',
  'last quarter': '🌗',
  'waning crescent': '🌘',
};

/** Calendar-local midnight, using the same calendar engine as all other chronology dates. */
export function calendarMonthDays(
  calendar: FantasyCalendarLike,
  year: number,
  month: number,
) {
  const segment = getMonthsForYear(
    year,
    parseMonths(calendar.months),
    parseLeapRules(calendar.leapDays),
  )[month];
  const days = new Map<number, CalendarState>();
  for (let day = 1; day <= (segment?.length ?? 0); day++) {
    days.set(
      day,
      convertEpochToCalendarState(
        calendarEpochMinuteForDate(calendar, year, month, day),
        calendar,
      ),
    );
  }
  return {
    days,
    climateAspect: segment?.climateAspect,
    isIntercalary: segment?.type === 'intercalary',
  };
}
