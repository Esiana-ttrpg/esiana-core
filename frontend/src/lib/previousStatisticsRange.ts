import type { PersonalStatisticsRangeMode } from '@shared/statsTypes';

export type StatisticsQueryOptions = {
  range: PersonalStatisticsRangeMode;
  from?: string;
  to?: string;
};

type CivilDate = { year: number; month: number; day: number };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatCivil(civil: CivilDate): string {
  return `${civil.year}-${pad(civil.month)}-${pad(civil.day)}`;
}

function civilPartsInZone(date: Date, timeZone: string): CivilDate & {
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(civil: CivilDate, deltaMonths: number): CivilDate {
  const index = civil.year * 12 + (civil.month - 1) + deltaMonths;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const day = Math.min(civil.day, daysInMonth(year, month));
  return { year, month, day };
}

function addDays(civil: CivilDate, deltaDays: number): CivilDate {
  const utc = new Date(Date.UTC(civil.year, civil.month - 1, civil.day + deltaDays));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function civilKeyInZone(date: Date, timeZone: string): string {
  const parts = civilPartsInZone(date, timeZone);
  return formatCivil(parts);
}

/**
 * Preceding comparable window for period deltas and dual-series charts.
 * - month: prior calendar month, same elapsed civil days
 * - year: prior calendar year, same elapsed civil days
 * - custom: equivalent elapsed duration ending at the current window start
 * All-time has no comparison.
 *
 * Custom `to` is an exclusive civil day (matches statistics range API).
 */
export function previousComparableQuery(input: {
  mode: PersonalStatisticsRangeMode;
  start: string | null;
  end: string;
  timeZone: string;
}): StatisticsQueryOptions | null {
  if (input.mode === 'all_time' || !input.start) return null;

  const start = new Date(input.start);
  const end = new Date(input.end);
  if (!(end.getTime() > start.getTime())) return null;

  if (input.mode === 'month' || input.mode === 'year') {
    const deltaMonths = input.mode === 'month' ? -1 : -12;
    const startCivil = civilPartsInZone(start, input.timeZone);
    const endCivil = civilPartsInZone(end, input.timeZone);
    const prevStart = addMonths(startCivil, deltaMonths);
    const prevEndDay = addMonths(
      { year: endCivil.year, month: endCivil.month, day: endCivil.day },
      deltaMonths,
    );
    // Exclusive end: include the full corresponding last civil day.
    const prevToExclusive = addDays(prevEndDay, 1);
    return {
      range: 'custom',
      from: formatCivil(prevStart),
      to: formatCivil(prevToExclusive),
    };
  }

  const durationMs = end.getTime() - start.getTime();
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return {
    range: 'custom',
    from: civilKeyInZone(prevStart, input.timeZone),
    to: civilKeyInZone(prevEnd, input.timeZone),
  };
}

export type PeriodComparison =
  | { kind: 'percent'; deltaPct: number }
  | { kind: 'absolute'; delta: number }
  | { kind: 'first' }
  | { kind: 'same' };

export function comparePeriodAmounts(
  current: number | null,
  previous: number | null,
): PeriodComparison | null {
  if (current == null) return null;
  if (previous == null) return null;
  if (previous === 0) {
    if (current === 0) return { kind: 'same' };
    return { kind: 'first' };
  }
  if (current === previous) return { kind: 'same' };
  const deltaPct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(deltaPct)) return { kind: 'absolute', delta: current - previous };
  return { kind: 'percent', deltaPct };
}

/** Long label for a statistics window, e.g. "October 2026" or "2026". */
export function formatPeriodWindowLabel(input: {
  mode: PersonalStatisticsRangeMode;
  start: string | null;
  end: string;
  timeZone: string;
  locale: string;
}): string | null {
  if (!input.start && input.mode !== 'all_time') return null;
  if (input.mode === 'all_time') return null;

  const end = new Date(input.end);
  const endCivil = civilPartsInZone(end, input.timeZone);

  if (input.mode === 'year') {
    return new Intl.DateTimeFormat(input.locale, {
      timeZone: input.timeZone,
      year: 'numeric',
    }).format(end);
  }

  if (input.mode === 'month') {
    const start = input.start ? new Date(input.start) : end;
    return new Intl.DateTimeFormat(input.locale, {
      timeZone: input.timeZone,
      month: 'long',
      year: 'numeric',
    }).format(start);
  }

  const start = input.start ? new Date(input.start) : end;
  const startLabel = new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(end);
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

/** Short label for deltas, e.g. "Sep 2026" or "2025". */
export function formatShortPeriodWindowLabel(input: {
  mode: PersonalStatisticsRangeMode;
  start: string | null;
  end: string;
  timeZone: string;
  locale: string;
}): string | null {
  if (!input.start && input.mode !== 'year') return null;
  const anchor = input.start ? new Date(input.start) : new Date(input.end);

  if (input.mode === 'year') {
    return new Intl.DateTimeFormat(input.locale, {
      timeZone: input.timeZone,
      year: 'numeric',
    }).format(new Date(input.end));
  }

  if (input.mode === 'month') {
    return new Intl.DateTimeFormat(input.locale, {
      timeZone: input.timeZone,
      month: 'short',
      year: 'numeric',
    }).format(anchor);
  }

  return new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(anchor);
}

export function formatPeriodComparisonCaption(input: {
  mode: PersonalStatisticsRangeMode;
  currentStart: string | null;
  currentEnd: string;
  previousStart: string | null;
  previousEnd: string;
  timeZone: string;
  locale: string;
}): string | null {
  if (input.mode === 'all_time') return null;
  const current = formatPeriodWindowLabel({
    mode: input.mode,
    start: input.currentStart,
    end: input.currentEnd,
    timeZone: input.timeZone,
    locale: input.locale,
  });
  const previous = formatPeriodWindowLabel({
    mode: input.mode,
    start: input.previousStart,
    end: input.previousEnd,
    timeZone: input.timeZone,
    locale: input.locale,
  });
  if (!current || !previous) return null;
  return `${current} vs. ${previous}`;
}

export function possessiveName(displayName: string): string {
  const name = displayName.trim();
  if (!name) return '';
  const last = name.charAt(name.length - 1).toLocaleLowerCase();
  return last === 's' ? `${name}'` : `${name}'s`;
}

/** Align daily trend points for month views by day-of-month. */
export function alignDailySeriesByDayOfMonth(
  current: Array<{ date: string; value: number }>,
  previous: Array<{ date: string; value: number }>,
): Array<{ key: string; label: string; current: number; previous: number }> {
  const curr = new Map(
    current.map((row) => [Number(row.date.slice(8, 10)), row.value]),
  );
  const prev = new Map(
    previous.map((row) => [Number(row.date.slice(8, 10)), row.value]),
  );
  const days = [...new Set([...curr.keys(), ...prev.keys()])].sort((a, b) => a - b);
  return days.map((day) => ({
    key: String(day),
    label: String(day),
    current: curr.get(day) ?? 0,
    previous: prev.get(day) ?? 0,
  }));
}

/** Aggregate daily points to months and align year-over-year. */
export function alignDailySeriesByMonth(
  current: Array<{ date: string; value: number }>,
  previous: Array<{ date: string; value: number }>,
  locale: string,
): Array<{ key: string; label: string; current: number; previous: number }> {
  const sumByMonth = (rows: Array<{ date: string; value: number }>) => {
    const map = new Map<number, number>();
    for (const row of rows) {
      const month = Number(row.date.slice(5, 7));
      map.set(month, (map.get(month) ?? 0) + row.value);
    }
    return map;
  };
  const curr = sumByMonth(current);
  const prev = sumByMonth(previous);
  const months = [...new Set([...curr.keys(), ...prev.keys()])].sort((a, b) => a - b);
  return months.map((month) => {
    const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
      new Date(Date.UTC(2020, month - 1, 15)),
    );
    return {
      key: String(month),
      label,
      current: curr.get(month) ?? 0,
      previous: prev.get(month) ?? 0,
    };
  });
}

/** Align by elapsed index for custom windows. */
export function alignDailySeriesByIndex(
  current: Array<{ date: string; value: number }>,
  previous: Array<{ date: string; value: number }>,
): Array<{ key: string; label: string; current: number; previous: number }> {
  const length = Math.max(current.length, previous.length);
  const rows: Array<{ key: string; label: string; current: number; previous: number }> =
    [];
  for (let i = 0; i < length; i += 1) {
    const curr = current[i];
    const prev = previous[i];
    rows.push({
      key: String(i),
      label: curr?.date.slice(5) ?? prev?.date.slice(5) ?? String(i + 1),
      current: curr?.value ?? 0,
      previous: prev?.value ?? 0,
    });
  }
  return rows;
}
