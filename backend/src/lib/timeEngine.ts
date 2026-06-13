import type { FantasyCalendar } from '@prisma/client';
import { normalizeClimateAspect, type ClimateAspect } from './climateAspect.js';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const MOON_PHASES = [
  'new',
  'waxing crescent',
  'first quarter',
  'waxing gibbous',
  'full',
  'waning gibbous',
  'last quarter',
  'waning crescent',
] as const;

export interface CalendarWeekday {
  name: string;
  length: number;
}

export interface CalendarMonth {
  name: string;
  length: number;
  type: 'standard' | 'intercalary';
  climateAspect?: ClimateAspect;
}

export interface CalendarSeason {
  name: string;
  startMonthIndex: number;
  startDay: number;
}

export interface CalendarMoon {
  name: string;
  cycleDays: number;
}

export interface LeapDayRule {
  everyYears?: number;
  remainder?: number;
  afterMonthIndex?: number;
  insertAfterMonthIndex?: number;
  month?: CalendarMonth;
  extraMonth?: CalendarMonth;
}

export interface CalendarState {
  year: number;
  monthIndex: number;
  monthName: string;
  day: number;
  hour: number;
  minute: number;
  weekdayName: string;
  seasonName: string;
  isIntercalary: boolean;
  activeMoonPhases: Array<{ name: string; phase: string }>;
}

export interface FantasyCalendarLike {
  epochOffset: bigint;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
}

function divFloor(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    throw new Error('Division by zero');
  }

  const quotient = a / b;
  const remainder = a % b;
  if (remainder !== 0n && (remainder > 0n) !== (b > 0n)) {
    return quotient - 1n;
  }
  return quotient;
}

function modPositive(value: bigint, modulus: bigint): bigint {
  const remainder = value % modulus;
  return remainder < 0n ? remainder + modulus : remainder;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseWeekdays(value: unknown): CalendarWeekday[] {
  return asArray(value)
    .map((entry) => {
      const row = asObject(entry);
      if (!row) return null;
      const name = asString(row.name).trim();
      const length = Math.max(1, Math.floor(asNumber(row.length, 1)));
      if (!name) return null;
      return { name, length };
    })
    .filter((entry): entry is CalendarWeekday => entry !== null);
}

export function parseMonths(value: unknown): CalendarMonth[] {
  return asArray(value)
    .map((entry) => {
      const row = asObject(entry);
      if (!row) return null;
      const name = asString(row.name).trim();
      const length = Math.max(1, Math.floor(asNumber(row.length, 1)));
      const typeRaw = asString(row.type, 'standard');
      const type: CalendarMonth['type'] =
        typeRaw === 'intercalary' ? 'intercalary' : 'standard';
      if (!name) return null;
      return {
        name,
        length,
        type,
        climateAspect: normalizeClimateAspect(row.climateAspect),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function parseSeasons(value: unknown): CalendarSeason[] {
  return asArray(value)
    .map((entry) => {
      const row = asObject(entry);
      if (!row) return null;
      const name = asString(row.name).trim();
      const startMonthIndex = Math.max(0, Math.floor(asNumber(row.startMonthIndex, 0)));
      const startDay = Math.max(1, Math.floor(asNumber(row.startDay, 1)));
      if (!name) return null;
      return { name, startMonthIndex, startDay };
    })
    .filter((entry): entry is CalendarSeason => entry !== null);
}

export function parseMoons(value: unknown): CalendarMoon[] {
  return asArray(value)
    .map((entry) => {
      const row = asObject(entry);
      if (!row) return null;
      const name = asString(row.name).trim();
      const cycleDays = asNumber(row.cycleDays, 0);
      if (!name || cycleDays <= 0) return null;
      return { name, cycleDays };
    })
    .filter((entry): entry is CalendarMoon => entry !== null);
}

function parseMonthEntry(value: unknown): CalendarMonth | null {
  const row = asObject(value);
  if (!row) return null;
  const name = asString(row.name).trim();
  const length = Math.max(1, Math.floor(asNumber(row.length, 1)));
  const typeRaw = asString(row.type, 'standard');
  const type = typeRaw === 'intercalary' ? 'intercalary' : 'standard';
  if (!name) return null;
  return { name, length, type };
}

export function parseLeapRules(value: unknown): LeapDayRule[] {
  const rules: LeapDayRule[] = [];

  for (const entry of asArray(value)) {
    const row = asObject(entry);
    if (!row) continue;

    const everyYears = Math.floor(asNumber(row.everyYears, 0));
    if (everyYears <= 0) continue;

    const rule: LeapDayRule = {
      everyYears,
      remainder: Math.floor(asNumber(row.remainder, 0)),
    };

    const afterMonthIndex = row.afterMonthIndex ?? row.insertAfterMonthIndex;
    if (afterMonthIndex !== undefined) {
      rule.afterMonthIndex = Math.floor(asNumber(afterMonthIndex, 0));
    }

    const month = parseMonthEntry(row.month ?? row.extraMonth);
    if (month) {
      rule.month = month;
    }

    rules.push(rule);
  }

  return rules;
}

function isLeapYear(year: number, leapRules: LeapDayRule[]): boolean {
  return leapRules.some(
    (rule) =>
      rule.everyYears !== undefined &&
      rule.everyYears > 0 &&
      year % rule.everyYears === (rule.remainder ?? 0),
  );
}

export function getMonthsForYear(
  year: number,
  baseMonths: CalendarMonth[],
  leapRules: LeapDayRule[],
): CalendarMonth[] {
  if (baseMonths.length === 0) {
    return [{ name: 'Month', length: 30, type: 'standard' }];
  }

  if (!isLeapYear(year, leapRules)) {
    return [...baseMonths];
  }

  const months = [...baseMonths];
  const applicableRules = leapRules
    .filter(
      (rule) =>
        rule.everyYears !== undefined &&
        rule.everyYears > 0 &&
        year % rule.everyYears === (rule.remainder ?? 0) &&
        (rule.month ?? rule.extraMonth),
    )
    .sort(
      (a, b) =>
        (a.afterMonthIndex ?? a.insertAfterMonthIndex ?? months.length - 1) -
        (b.afterMonthIndex ?? b.insertAfterMonthIndex ?? months.length - 1),
    );

  let insertOffset = 0;
  for (const rule of applicableRules) {
    const extraMonth = rule.month ?? rule.extraMonth;
    if (!extraMonth) continue;

    const anchorIndex =
      rule.afterMonthIndex ?? rule.insertAfterMonthIndex ?? months.length - 1;
    const insertAt = Math.min(Math.max(anchorIndex + 1 + insertOffset, 0), months.length);
    months.splice(insertAt, 0, extraMonth);
    insertOffset += 1;
  }

  return months;
}

export function getYearMonthCount(calendar: FantasyCalendarLike, year: number): number {
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);
  return getMonthsForYear(year, baseMonths, leapRules).length;
}

export function resolveMonthName(
  calendar: FantasyCalendarLike,
  year: number,
  monthIndex: number,
): string {
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);
  const yearMonths = getMonthsForYear(year, baseMonths, leapRules);
  if (yearMonths.length === 0) {
    return `Month ${monthIndex + 1}`;
  }
  const safeIndex = Math.max(0, Math.min(monthIndex, yearMonths.length - 1));
  return yearMonths[safeIndex]?.name ?? `Month ${monthIndex + 1}`;
}

/** Iteratively sum variable month lengths (incl. intercalary/leap) to reach a calendar date. */
export function calendarEpochMinuteForDate(
  calendar: FantasyCalendarLike,
  year: number,
  monthIndex: number,
  day: number,
): bigint {
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);
  const safeYear = Math.max(1, Math.floor(year));

  let totalDays = 0n;
  for (let y = 1; y < safeYear; y += 1) {
    const priorYearMonths = getMonthsForYear(y, baseMonths, leapRules);
    for (const month of priorYearMonths) {
      totalDays += BigInt(month.length);
    }
  }

  const yearMonths = getMonthsForYear(safeYear, baseMonths, leapRules);
  const lastIndex = Math.max(0, yearMonths.length - 1);
  const safeMonthIndex = Math.max(0, Math.min(Math.floor(monthIndex), lastIndex));

  for (let i = 0; i < safeMonthIndex; i += 1) {
    totalDays += BigInt(yearMonths[i]?.length ?? 0);
  }

  const segment = yearMonths[safeMonthIndex];
  const maxDay = segment?.length ?? 1;
  const safeDay = Math.min(Math.max(1, Math.floor(day)), Math.max(1, maxDay));
  totalDays += BigInt(safeDay - 1);

  return calendar.epochOffset + totalDays * BigInt(MINUTES_PER_DAY);
}

function weekdayNameForStandardDay(
  standardDayIndex: bigint,
  weekdays: CalendarWeekday[],
): string {
  if (weekdays.length === 0) {
    return '';
  }

  const cycleLength = weekdays.reduce((sum, weekday) => sum + weekday.length, 0);
  if (cycleLength <= 0) {
    return weekdays[0]?.name ?? '';
  }

  let position = Number(modPositive(standardDayIndex, BigInt(cycleLength)));
  for (const weekday of weekdays) {
    if (position < weekday.length) {
      return weekday.name;
    }
    position -= weekday.length;
  }

  return weekdays[0]?.name ?? '';
}

function seasonNameForDate(
  monthIndex: number,
  day: number,
  seasons: CalendarSeason[],
  monthsInYear: number,
): string {
  if (seasons.length === 0) {
    return '';
  }

  const dayOfYearScore = (month: number, dayOfMonth: number) =>
    month * 1000 + dayOfMonth;

  const currentScore = dayOfYearScore(monthIndex, day);
  const sorted = [...seasons].sort(
    (a, b) =>
      dayOfYearScore(a.startMonthIndex, a.startDay) -
      dayOfYearScore(b.startMonthIndex, b.startDay),
  );

  let active = sorted[sorted.length - 1]?.name ?? '';
  for (const season of sorted) {
    if (currentScore >= dayOfYearScore(season.startMonthIndex, season.startDay)) {
      active = season.name;
    }
  }

  if (
    active === '' &&
    sorted.length > 0 &&
    currentScore < dayOfYearScore(sorted[0].startMonthIndex, sorted[0].startDay)
  ) {
    active = sorted[sorted.length - 1]?.name ?? '';
  }

  if (active === '' && monthsInYear > 0) {
    active = sorted[0]?.name ?? '';
  }

  return active;
}

function moonPhaseName(cycleDays: number, elapsedDays: number): string {
  if (cycleDays <= 0) {
    return MOON_PHASES[0];
  }

  const position = ((elapsedDays % cycleDays) + cycleDays) % cycleDays;
  const phaseIndex = Math.floor((position / cycleDays) * MOON_PHASES.length);
  return MOON_PHASES[Math.min(phaseIndex, MOON_PHASES.length - 1)] ?? MOON_PHASES[0];
}

function activeMoonPhasesForElapsedDays(
  elapsedDays: number,
  moons: CalendarMoon[],
): Array<{ name: string; phase: string }> {
  return moons.map((moon) => ({
    name: moon.name,
    phase: moonPhaseName(moon.cycleDays, elapsedDays),
  }));
}

function resolveCalendarDate(
  totalDays: bigint,
  baseMonths: CalendarMonth[],
  leapRules: LeapDayRule[],
): {
  year: number;
  monthIndex: number;
  monthName: string;
  day: number;
  isIntercalary: boolean;
  standardDayIndex: bigint;
  elapsedDays: number;
} {
  if (totalDays < 0n) {
    return {
      year: 1,
      monthIndex: 0,
      monthName: baseMonths[0]?.name ?? 'Month',
      day: 1,
      isIntercalary: baseMonths[0]?.type === 'intercalary',
      standardDayIndex: 0n,
      elapsedDays: 0,
    };
  }

  let remainingDays = totalDays;
  let year = 1;
  let elapsedDays = 0;
  let standardDayIndex = 0n;

  while (true) {
    const yearMonths = getMonthsForYear(year, baseMonths, leapRules);
    const daysInYear = yearMonths.reduce((sum, month) => sum + month.length, 0);
    if (daysInYear <= 0) {
      break;
    }

    if (remainingDays < BigInt(daysInYear)) {
      let monthIndex = 0;
      let day = 1;
      let monthName = yearMonths[0]?.name ?? 'Month';
      let isIntercalary = yearMonths[0]?.type === 'intercalary';

      for (let index = 0; index < yearMonths.length; index += 1) {
        const month = yearMonths[index];
        if (remainingDays < BigInt(month.length)) {
          monthIndex = index;
          day = Number(remainingDays) + 1;
          monthName = month.name;
          isIntercalary = month.type === 'intercalary';
          break;
        }

        if (month.type === 'standard') {
          standardDayIndex += BigInt(month.length);
        }

        elapsedDays += month.length;
        remainingDays -= BigInt(month.length);
      }

      if (!isIntercalary) {
        standardDayIndex += BigInt(day - 1);
      }

      return {
        year,
        monthIndex,
        monthName,
        day,
        isIntercalary,
        standardDayIndex,
        elapsedDays: elapsedDays + day - 1,
      };
    }

    for (const month of yearMonths) {
      if (month.type === 'standard') {
        standardDayIndex += BigInt(month.length);
      }
      elapsedDays += month.length;
    }

    remainingDays -= BigInt(daysInYear);
    year += 1;
  }

  return {
    year: 1,
    monthIndex: 0,
    monthName: baseMonths[0]?.name ?? 'Month',
    day: 1,
    isIntercalary: baseMonths[0]?.type === 'intercalary',
    standardDayIndex: 0n,
    elapsedDays: 0,
  };
}

export function convertEpochToCalendarState(
  epochMinute: bigint,
  calendar: FantasyCalendar | FantasyCalendarLike,
): CalendarState {
  const weekdays = parseWeekdays(calendar.weekdays);
  const baseMonths = parseMonths(calendar.months);
  const seasons = parseSeasons(calendar.seasons);
  const moons = parseMoons(calendar.moons);
  const leapRules = parseLeapRules(calendar.leapDays);

  const calendarMinute = epochMinute - calendar.epochOffset;
  const minuteInDay = Number(modPositive(calendarMinute, BigInt(MINUTES_PER_DAY)));
  const hour = Math.floor(minuteInDay / MINUTES_PER_HOUR);
  const minute = minuteInDay % MINUTES_PER_HOUR;
  const totalDays = divFloor(calendarMinute, BigInt(MINUTES_PER_DAY));

  const resolved = resolveCalendarDate(totalDays, baseMonths, leapRules);
  const yearMonths = getMonthsForYear(resolved.year, baseMonths, leapRules);
  const weekdayName = resolved.isIntercalary
    ? ''
    : weekdayNameForStandardDay(resolved.standardDayIndex, weekdays);

  return {
    year: resolved.year,
    monthIndex: resolved.monthIndex,
    monthName: resolved.monthName,
    day: resolved.day,
    hour,
    minute,
    weekdayName,
    seasonName: seasonNameForDate(
      resolved.monthIndex,
      resolved.day,
      seasons,
      yearMonths.length,
    ),
    isIntercalary: resolved.isIntercalary,
    activeMoonPhases: activeMoonPhasesForElapsedDays(
      resolved.elapsedDays + (minuteInDay / MINUTES_PER_DAY),
      moons,
    ),
  };
}

export function serializeCalendarState(state: CalendarState) {
  return state;
}

export type MonthGridRow =
  | {
      kind: 'standardWeek';
      cells: Array<{ day: number; isToday: boolean } | null>;
    }
  | {
      kind: 'intercalaryBanner';
      monthName: string;
      day: number;
      isToday: boolean;
    };

export interface CalendarMonthViewport {
  columnLabels: string[];
  monthTitle: string;
  rows: MonthGridRow[];
  /** True when the viewed segment is an intercalary month (grid is banner-only). */
  isIntercalaryMonth: boolean;
}

/** Build column labels for one full weekday cycle (one column per day slot in the cycle). */
export function buildWeekdayColumnLabels(weekdays: CalendarWeekday[]): string[] {
  if (weekdays.length === 0) {
    return ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  }
  const labels: string[] = [];
  for (const slot of weekdays) {
    for (let i = 0; i < slot.length; i += 1) {
      labels.push(slot.name);
    }
  }
  return labels;
}

/**
 * Standard-day count from calendar year start up to (but not including) `monthIndex`
 * in the resolved year month list.
 */
export function standardDaysBeforeMonthIndex(
  yearMonths: CalendarMonth[],
  monthIndex: number,
): bigint {
  let total = 0n;
  for (let i = 0; i < monthIndex && i < yearMonths.length; i += 1) {
    if (yearMonths[i].type === 'standard') {
      total += BigInt(yearMonths[i].length);
    }
  }
  return total;
}

/**
 * Month grid for the calendar segment containing the instant `epochMinute`.
 * Intercalary months render as full-width banner rows (no weekday columns).
 */
export function buildCalendarMonthViewport(
  epochMinute: bigint,
  calendar: FantasyCalendar | FantasyCalendarLike,
): CalendarMonthViewport {
  const weekdays = parseWeekdays(calendar.weekdays);
  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);

  const calendarMinute = epochMinute - calendar.epochOffset;
  const totalDays = divFloor(calendarMinute, BigInt(MINUTES_PER_DAY));
  const resolved = resolveCalendarDate(totalDays, baseMonths, leapRules);
  const yearMonths = getMonthsForYear(resolved.year, baseMonths, leapRules);
  const segment = yearMonths[resolved.monthIndex];
  const monthTitle = segment?.name ?? resolved.monthName;

  if (!segment || segment.type === 'intercalary') {
    return {
      columnLabels: buildWeekdayColumnLabels(weekdays),
      monthTitle,
      rows: [
        {
          kind: 'intercalaryBanner',
          monthName: monthTitle,
          day: resolved.day,
          isToday: true,
        },
      ],
      isIntercalaryMonth: true,
    };
  }

  const columnLabels = buildWeekdayColumnLabels(weekdays);
  const colCount = columnLabels.length;
  if (colCount === 0) {
    return {
      columnLabels: ['—'],
      monthTitle,
      rows: [],
      isIntercalaryMonth: false,
    };
  }

  const startStandard = standardDaysBeforeMonthIndex(yearMonths, resolved.monthIndex);
  const startColumn = Number(modPositive(startStandard, BigInt(colCount)));

  const rows: MonthGridRow[] = [];
  let dayCursor = 1;
  let gridColumn = startColumn;

  while (dayCursor <= segment.length) {
    const cells: Array<{ day: number; isToday: boolean } | null> = Array(colCount).fill(
      null,
    ) as Array<{ day: number; isToday: boolean } | null>;
    while (gridColumn < colCount && dayCursor <= segment.length) {
      const isToday = dayCursor === resolved.day;
      cells[gridColumn] = { day: dayCursor, isToday };
      dayCursor += 1;
      gridColumn += 1;
    }
    rows.push({ kind: 'standardWeek', cells });
    gridColumn = 0;
  }

  return {
    columnLabels,
    monthTitle,
    rows,
    isIntercalaryMonth: false,
  };
}

export type CalendarShiftResult = {
  nextEpochMinute: bigint;
  previousCalendarState: CalendarState;
  nextCalendarState: CalendarState;
  actualMinuteDelta: bigint;
  clampedDay: boolean;
  requestedDay: number;
  resolvedDay: number;
};

/**
 * Advance by N calendar months on the same relative day-of-month (clamped to month length).
 * Preserves local time-of-day — never snaps to midnight.
 */
export function advanceCalendarByMonths(
  epochMinute: bigint,
  calendar: FantasyCalendar | FantasyCalendarLike,
  monthsToAdd: number,
): CalendarShiftResult {
  const steps = Math.max(0, Math.floor(monthsToAdd));
  const previousCalendarState = convertEpochToCalendarState(epochMinute, calendar);

  const baseMonths = parseMonths(calendar.months);
  const leapRules = parseLeapRules(calendar.leapDays);

  let year = previousCalendarState.year;
  let monthIndex = previousCalendarState.monthIndex;
  const requestedDay = previousCalendarState.day;
  const hour = previousCalendarState.hour;
  const minute = previousCalendarState.minute;

  for (let step = 0; step < steps; step += 1) {
    const yearMonths = getMonthsForYear(year, baseMonths, leapRules);
    const monthCount = yearMonths.length;
    if (monthCount === 0) {
      break;
    }

    monthIndex += 1;
    if (monthIndex >= monthCount) {
      monthIndex = 0;
      year += 1;
    }
  }

  const targetYearMonths = getMonthsForYear(year, baseMonths, leapRules);
  const targetMonth = targetYearMonths[monthIndex];
  const maxDay = targetMonth?.length ?? 1;
  const resolvedDay = Math.min(requestedDay, Math.max(1, maxDay));
  const clampedDay = resolvedDay < requestedDay;

  const dayStartEpoch = calendarEpochMinuteForDate(calendar, year, monthIndex, resolvedDay);
  const timeOfDayOffset = BigInt(hour * MINUTES_PER_HOUR + minute);
  const nextEpochMinute = dayStartEpoch + timeOfDayOffset;
  const actualMinuteDelta = nextEpochMinute - epochMinute;
  const nextCalendarState = convertEpochToCalendarState(nextEpochMinute, calendar);

  return {
    nextEpochMinute,
    previousCalendarState,
    nextCalendarState,
    actualMinuteDelta,
    clampedDay,
    requestedDay,
    resolvedDay,
  };
}
