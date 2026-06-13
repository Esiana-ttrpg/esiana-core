/**
 * Campaign time advancement units — single source of truth (browser-safe).
 *
 * Duration units use arithmetic epoch deltas. `months` is calendar-relative only —
 * never convert months to minutes via averages anywhere in the stack.
 */

export const TIME_ADVANCE_UNITS = [
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
] as const;

export type TimeAdvanceUnit = (typeof TIME_ADVANCE_UNITS)[number];

/** Arithmetic units only — never includes `months`. */
export const DURATION_ADVANCE_UNITS = [
  'minutes',
  'hours',
  'days',
  'weeks',
] as const;

export type DurationAdvanceUnit = (typeof DURATION_ADVANCE_UNITS)[number];

export const TIME_ADVANCE_UNIT_LABELS: Record<TimeAdvanceUnit, string> = {
  minutes: 'minutes',
  hours: 'hours',
  days: 'days',
  weeks: 'weeks',
  months: 'months',
};

/** Future-facing (not implemented v1). */
export type CalendarDelta =
  | { kind: 'duration'; minutes: string }
  | { kind: 'calendar'; unit: 'months'; amount: number };

export type SessionTimeAdvancePreset = {
  id: string;
  label: string;
  amount: number;
  unit: TimeAdvanceUnit;
};

/** Presentation-only flavor scaffolding — not canonical business logic. */
export const SESSION_TIME_ADVANCE_PRESETS: readonly SessionTimeAdvancePreset[] = [
  { id: 'short_rest', label: 'Short rest', amount: 8, unit: 'hours' },
  { id: 'travel_day', label: 'Travel day', amount: 1, unit: 'days' },
  { id: 'downtime', label: 'Downtime', amount: 3, unit: 'days' },
  { id: 'week_at_sea', label: 'Week at sea', amount: 1, unit: 'weeks' },
  { id: 'long_voyage', label: 'Long voyage', amount: 2, unit: 'weeks' },
  { id: 'month_passes', label: 'Month passes', amount: 1, unit: 'months' },
] as const;

export function isTimeAdvanceUnit(value: unknown): value is TimeAdvanceUnit {
  return (
    typeof value === 'string' &&
    (TIME_ADVANCE_UNITS as readonly string[]).includes(value)
  );
}

export function isDurationAdvanceUnit(value: unknown): value is DurationAdvanceUnit {
  return (
    typeof value === 'string' &&
    (DURATION_ADVANCE_UNITS as readonly string[]).includes(value)
  );
}
