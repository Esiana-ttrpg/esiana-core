import type { PersonalStatisticsRangeMode } from '../../../../../shared/statsTypes.js';
import { addCivilDays, startOfZonedDay, zonedParts, zonedTimeToUtc } from './zonedTime.js';

export type ResolveStatisticsRangeInput = {
  mode: PersonalStatisticsRangeMode;
  timeZone: string;
  now: Date;
  from?: string | null;
  to?: string | null;
};

export type ResolvedStatisticsRange = {
  mode: PersonalStatisticsRangeMode;
  timeZone: string;
  start: Date | null;
  end: Date;
};

export class StatisticsRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatisticsRangeError';
  }
}

function parseYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) return null;
  return Number(value);
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

function parseCivilDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function clampEnd(end: Date, now: Date): Date {
  return end.getTime() > now.getTime() ? now : end;
}

export function resolveStatisticsRange(
  input: ResolveStatisticsRangeInput,
): ResolvedStatisticsRange {
  const now = input.now;
  const timeZone = input.timeZone;
  const current = zonedParts(now, timeZone);

  if (input.mode === 'all_time') {
    return { mode: input.mode, timeZone, start: null, end: now };
  }

  if (input.mode === 'year') {
    const parsed = input.from
      ? parseYear(input.from) ?? parseYearMonth(input.from)?.year ?? parseCivilDate(input.from)?.year
      : current.year;
    if (parsed == null) {
      throw new StatisticsRangeError('year range requires from=YYYY');
    }
    const start = zonedTimeToUtc(timeZone, parsed, 1, 1);
    const end = clampEnd(zonedTimeToUtc(timeZone, parsed + 1, 1, 1), now);
    return { mode: input.mode, timeZone, start, end };
  }

  if (input.mode === 'month') {
    const parsed = input.from
      ? parseYearMonth(input.from) ?? (() => {
          const civil = parseCivilDate(input.from!);
          return civil ? { year: civil.year, month: civil.month } : null;
        })()
      : { year: current.year, month: current.month };
    if (parsed == null) {
      throw new StatisticsRangeError('month range requires from=YYYY-MM');
    }
    const start = zonedTimeToUtc(timeZone, parsed.year, parsed.month, 1);
    const next =
      parsed.month === 12
        ? { year: parsed.year + 1, month: 1 }
        : { year: parsed.year, month: parsed.month + 1 };
    const end = clampEnd(zonedTimeToUtc(timeZone, next.year, next.month, 1), now);
    return { mode: input.mode, timeZone, start, end };
  }

  const from = input.from ? parseCivilDate(input.from) : null;
  if (!from) {
    throw new StatisticsRangeError('custom range requires from=YYYY-MM-DD');
  }
  const start = zonedTimeToUtc(timeZone, from.year, from.month, from.day);
  let end = now;
  if (input.to) {
    const to = parseCivilDate(input.to);
    if (!to) {
      throw new StatisticsRangeError('custom range to must be YYYY-MM-DD');
    }
    end = zonedTimeToUtc(timeZone, to.year, to.month, to.day);
  }
  end = clampEnd(end, now);
  if (start.getTime() >= end.getTime()) {
    throw new StatisticsRangeError('custom range from must be before to');
  }
  return { mode: input.mode, timeZone, start, end };
}

export function createdAtFilter(range: ResolvedStatisticsRange): {
  gte?: Date;
  lt: Date;
} {
  return range.start ? { gte: range.start, lt: range.end } : { lt: range.end };
}

export function lookbackInterval(
  now: Date,
  timeZone: string,
  days: number,
): { gte: Date; lt: Date } {
  const todayStart = startOfZonedDay(now, timeZone);
  const today = zonedParts(todayStart, timeZone);
  const startCivil = addCivilDays({ year: today.year, month: today.month, day: today.day }, -(days - 1));
  return {
    gte: zonedTimeToUtc(timeZone, startCivil.year, startCivil.month, startCivil.day),
    lt: now,
  };
}

/** Union of habit lookback and reporting range; null when neither window is requested. */
export function contributionQueryWindow(input: {
  includeHabits: boolean;
  skipPeriod: boolean;
  streakLookback: { gte: Date; lt: Date };
  rangeStart: Date | null;
  rangeEnd: Date;
}): { gte: Date; lt: Date } | null {
  const windows: Array<{ gte: Date; lt: Date }> = [];
  if (input.includeHabits) windows.push(input.streakLookback);
  if (!input.skipPeriod) {
    windows.push({
      gte: input.rangeStart ?? new Date(0),
      lt: input.rangeEnd,
    });
  }
  if (windows.length === 0) return null;
  return {
    gte: new Date(Math.min(...windows.map((window) => window.gte.getTime()))),
    lt: new Date(Math.max(...windows.map((window) => window.lt.getTime()))),
  };
}
