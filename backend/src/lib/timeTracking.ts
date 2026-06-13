import type { FantasyCalendar } from '@prisma/client';
import type { TimeAdvanceUnit } from '../../../shared/timeAdvanceUnits.js';
import { normalizeClimateAspect } from './climateAspect.js';
import { parseAdvanceAmountAndUnit } from './computeTimeAdvance.js';
import {
  convertEpochToCalendarState,
  type CalendarMonth,
  type CalendarMoon,
  type CalendarSeason,
  type CalendarWeekday,
  type LeapDayRule,
} from './timeEngine.js';

export type { TimeAdvanceUnit };

export interface FantasyCalendarInput {
  name?: string;
  isMasterTime?: boolean;
  epochOffset?: bigint | number | string;
  weekdays?: CalendarWeekday[];
  months?: CalendarMonth[];
  seasons?: CalendarSeason[];
  moons?: CalendarMoon[];
  leapDays?: LeapDayRule[];
}

export function parseEpochOffset(value: unknown): bigint | null {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return BigInt(value.trim());
    } catch {
      return null;
    }
  }

  return value === undefined || value === null ? 0n : null;
}

export function parseAdvanceTimePayload(body: unknown): {
  amount: number;
  unit: TimeAdvanceUnit;
} | null {
  return parseAdvanceAmountAndUnit(body);
}

export function serializeEpochMinute(value: bigint): string {
  return value.toString();
}

export function buildCalendarStates(
  currentEpochMinute: bigint,
  calendars: FantasyCalendar[],
) {
  return calendars.map((calendar) => ({
    id: calendar.id,
    name: calendar.name,
    isMasterTime: calendar.isMasterTime,
    epochOffset: serializeEpochMinute(calendar.epochOffset),
    weekdays: calendar.weekdays,
    months: calendar.months,
    seasons: calendar.seasons,
    moons: calendar.moons,
    leapDays: calendar.leapDays,
    state: convertEpochToCalendarState(currentEpochMinute, calendar),
  }));
}

/** Default shape for POST `/calendars` (sample configuration). */
export function createBoilerplateFantasyCalendarData(
  displayName: string,
  options: { isMasterTime: boolean },
): {
  name: string;
  isMasterTime: boolean;
  epochOffset: bigint;
  weekdays: CalendarWeekday[];
  months: CalendarMonth[];
  seasons: CalendarSeason[];
  moons: CalendarMoon[];
  leapDays: LeapDayRule[];
} {
  const name = displayName.trim() || 'New chronology';
  return {
    name,
    isMasterTime: options.isMasterTime,
    epochOffset: 0n,
    weekdays: [
      { name: 'Starday', length: 1 },
      { name: 'Sunday', length: 1 },
      { name: 'Moonday', length: 1 },
      { name: 'Tuseday', length: 1 },
      { name: 'Wedsday', length: 1 },
      { name: 'Thursday', length: 1 },
      { name: 'Fryday', length: 1 },
    ],
    months: [
      { name: 'Deepwinter', length: 30, type: 'standard', climateAspect: 'NEUTRAL' },
      { name: 'Midwinter Festival', length: 1, type: 'intercalary', climateAspect: 'NEUTRAL' },
      { name: 'The Thaw', length: 30, type: 'standard', climateAspect: 'NEUTRAL' },
    ],
    seasons: [
      { name: 'Winter', startMonthIndex: 0, startDay: 1 },
      { name: 'Spring', startMonthIndex: 2, startDay: 1 },
    ],
    moons: [{ name: 'Primary moon', cycleDays: 29.5 }],
    leapDays: [],
  };
}

export function sanitizeCalendarMonths(months: unknown): CalendarMonth[] | null {
  if (!Array.isArray(months) || months.length === 0) {
    return null;
  }

  const rows: CalendarMonth[] = [];
  for (const entry of months) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) continue;
    const length =
      typeof row.length === 'number' && Number.isFinite(row.length)
        ? Math.max(1, Math.floor(row.length))
        : 1;
    const type = row.type === 'intercalary' ? 'intercalary' : 'standard';
    rows.push({
      name,
      length,
      type,
      climateAspect: normalizeClimateAspect(row.climateAspect),
    });
  }

  return rows.length > 0 ? rows : null;
}

type FantasyCalendarRowShape = {
  name: string;
  isMasterTime: boolean;
  epochOffset: bigint;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
};

/**
 * Merge JSON patch fields into an existing calendar row, then validate via {@link normalizeFantasyCalendarInput}.
 */
export function mergeFantasyCalendarPatch(
  existing: FantasyCalendarRowShape,
  body: Record<string, unknown>,
): ReturnType<typeof normalizeFantasyCalendarInput> | null {
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : existing.name;
  if (!name) {
    return null;
  }

  const isMasterTime =
    typeof body.isMasterTime === 'boolean'
      ? body.isMasterTime
      : existing.isMasterTime;

  let epochOffset = existing.epochOffset;
  if ('epochOffset' in body && body.epochOffset !== undefined) {
    const parsed = parseEpochOffset(body.epochOffset);
    if (parsed === null) {
      return null;
    }
    epochOffset = parsed;
  }

  const weekdays = Array.isArray(body.weekdays) ? body.weekdays : existing.weekdays;
  const months = Array.isArray(body.months) ? body.months : existing.months;
  const seasons = Array.isArray(body.seasons) ? body.seasons : existing.seasons;
  const moons = Array.isArray(body.moons) ? body.moons : existing.moons;
  const leapDays = Array.isArray(body.leapDays) ? body.leapDays : existing.leapDays;

  return normalizeFantasyCalendarInput({
    name,
    isMasterTime,
    epochOffset,
    weekdays: weekdays as CalendarWeekday[],
    months: months as CalendarMonth[],
    seasons: seasons as CalendarSeason[],
    moons: moons as CalendarMoon[],
    leapDays: leapDays as LeapDayRule[],
  });
}

export function normalizeFantasyCalendarInput(
  input: FantasyCalendarInput,
): {
  name: string;
  isMasterTime: boolean;
  epochOffset: bigint;
  weekdays: CalendarWeekday[];
  months: CalendarMonth[];
  seasons: CalendarSeason[];
  moons: CalendarMoon[];
  leapDays: LeapDayRule[];
} | null {
  const name = input.name?.trim();
  if (!name) {
    return null;
  }

  const epochOffset = parseEpochOffset(input.epochOffset);
  if (epochOffset === null) {
    return null;
  }

  const weekdays = Array.isArray(input.weekdays) ? input.weekdays : [];
  const months = sanitizeCalendarMonths(input.months);
  const seasons = Array.isArray(input.seasons) ? input.seasons : [];
  const moons = Array.isArray(input.moons) ? input.moons : [];
  const leapDays = Array.isArray(input.leapDays) ? input.leapDays : [];

  if (!months) {
    return null;
  }

  return {
    name,
    isMasterTime: Boolean(input.isMasterTime),
    epochOffset,
    weekdays,
    months,
    seasons,
    moons,
    leapDays,
  };
}
