import { apiFetch } from './api';
import {
  DEFAULT_CLIMATE_ASPECT,
  normalizeClimateAspect,
  type ClimateAspect,
} from './climateAspect';

export interface FantasyCalendarRecord {
  id: string;
  campaignId: string;
  name: string;
  isMasterTime: boolean;
  epochOffset: string;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface MonthFormRow {
  name: string;
  length: number;
  type: 'standard' | 'intercalary';
  climateAspect: ClimateAspect;
}

export type { ClimateAspect };

export interface WeekdayFormRow {
  name: string;
  length: number;
}

export interface MoonFormRow {
  name: string;
  cycleDays: number;
}

export interface SeasonFormRow {
  name: string;
  startMonthIndex: number;
  startDay: number;
}

export async function listFantasyCalendars(
  campaignHandle: string,
): Promise<FantasyCalendarRecord[]> {
  const data = await apiFetch<{ calendars: FantasyCalendarRecord[] }>(
    `/campaigns/${campaignHandle}/calendars`,
  );
  return data.calendars ?? [];
}

export async function createFantasyCalendar(
  campaignHandle: string,
  body?: { name?: string; isMasterTime?: boolean },
): Promise<FantasyCalendarRecord> {
  const data = await apiFetch<{ calendar: FantasyCalendarRecord }>(
    `/campaigns/${campaignHandle}/calendars`,
    {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    },
  );
  return data.calendar;
}

export async function patchFantasyCalendar(
  campaignHandle: string,
  calendarId: string,
  body: Record<string, unknown>,
): Promise<FantasyCalendarRecord> {
  const data = await apiFetch<{ calendar: FantasyCalendarRecord }>(
    `/campaigns/${campaignHandle}/calendars/${calendarId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
  return data.calendar;
}

export async function deleteFantasyCalendar(
  campaignHandle: string,
  calendarId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/campaigns/${campaignHandle}/calendars/${calendarId}`, {
    method: 'DELETE',
  });
}

export function normalizeMonthRows(raw: unknown): MonthFormRow[] {
  if (!Array.isArray(raw)) {
    return [{ name: 'Month One', length: 30, type: 'standard', climateAspect: DEFAULT_CLIMATE_ASPECT }];
  }
  const rows: MonthFormRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name : 'Untitled';
    const length =
      typeof o.length === 'number' && Number.isFinite(o.length)
        ? Math.max(1, Math.floor(o.length))
        : 1;
    const type = o.type === 'intercalary' ? 'intercalary' : 'standard';
    rows.push({
      name,
      length,
      type,
      climateAspect: normalizeClimateAspect(o.climateAspect),
    });
  }
  return rows.length > 0
    ? rows
    : [{ name: 'Month One', length: 30, type: 'standard', climateAspect: DEFAULT_CLIMATE_ASPECT }];
}

export function normalizeWeekdayRows(raw: unknown): WeekdayFormRow[] {
  if (!Array.isArray(raw)) return [{ name: 'Day', length: 1 }];
  const rows: WeekdayFormRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name : 'Day';
    const length =
      typeof o.length === 'number' && Number.isFinite(o.length)
        ? Math.max(1, Math.floor(o.length))
        : 1;
    rows.push({ name, length });
  }
  return rows.length > 0 ? rows : [{ name: 'Day', length: 1 }];
}

export function normalizeMoonRows(raw: unknown): MoonFormRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: MoonFormRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name : 'Moon';
    const cycleDays =
      typeof o.cycleDays === 'number' && Number.isFinite(o.cycleDays) && o.cycleDays > 0
        ? o.cycleDays
        : 29.5;
    rows.push({ name, cycleDays });
  }
  return rows;
}

export function normalizeSeasonRows(raw: unknown): SeasonFormRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: SeasonFormRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    rows.push({
      name: typeof o.name === 'string' ? o.name : 'Season',
      startMonthIndex:
        typeof o.startMonthIndex === 'number' && Number.isFinite(o.startMonthIndex)
          ? Math.max(0, Math.floor(o.startMonthIndex))
          : 0,
      startDay:
        typeof o.startDay === 'number' && Number.isFinite(o.startDay)
          ? Math.max(1, Math.floor(o.startDay))
          : 1,
    });
  }
  return rows;
}
