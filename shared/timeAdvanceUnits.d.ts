/**
 * Campaign time advancement units — single source of truth (browser-safe).
 *
 * Duration units use arithmetic epoch deltas. `months` is calendar-relative only —
 * never convert months to minutes via averages anywhere in the stack.
 */
export declare const TIME_ADVANCE_UNITS: readonly ["minutes", "hours", "days", "weeks", "months"];
export type TimeAdvanceUnit = (typeof TIME_ADVANCE_UNITS)[number];
/** Arithmetic units only — never includes `months`. */
export declare const DURATION_ADVANCE_UNITS: readonly ["minutes", "hours", "days", "weeks"];
export type DurationAdvanceUnit = (typeof DURATION_ADVANCE_UNITS)[number];
export declare const TIME_ADVANCE_UNIT_LABELS: Record<TimeAdvanceUnit, string>;
/** Future-facing (not implemented v1). */
export type CalendarDelta = {
    kind: 'duration';
    minutes: string;
} | {
    kind: 'calendar';
    unit: 'months';
    amount: number;
};
export type SessionTimeAdvancePreset = {
    id: string;
    label: string;
    amount: number;
    unit: TimeAdvanceUnit;
};
/** Presentation-only flavor scaffolding — not canonical business logic. */
export declare const SESSION_TIME_ADVANCE_PRESETS: readonly SessionTimeAdvancePreset[];
export declare function isTimeAdvanceUnit(value: unknown): value is TimeAdvanceUnit;
export declare function isDurationAdvanceUnit(value: unknown): value is DurationAdvanceUnit;
//# sourceMappingURL=timeAdvanceUnits.d.ts.map