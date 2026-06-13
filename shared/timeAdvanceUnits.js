"use strict";
/**
 * Campaign time advancement units — single source of truth (browser-safe).
 *
 * Duration units use arithmetic epoch deltas. `months` is calendar-relative only —
 * never convert months to minutes via averages anywhere in the stack.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_TIME_ADVANCE_PRESETS = exports.TIME_ADVANCE_UNIT_LABELS = exports.DURATION_ADVANCE_UNITS = exports.TIME_ADVANCE_UNITS = void 0;
exports.isTimeAdvanceUnit = isTimeAdvanceUnit;
exports.isDurationAdvanceUnit = isDurationAdvanceUnit;
exports.TIME_ADVANCE_UNITS = [
    'minutes',
    'hours',
    'days',
    'weeks',
    'months',
];
/** Arithmetic units only — never includes `months`. */
exports.DURATION_ADVANCE_UNITS = [
    'minutes',
    'hours',
    'days',
    'weeks',
];
exports.TIME_ADVANCE_UNIT_LABELS = {
    minutes: 'minutes',
    hours: 'hours',
    days: 'days',
    weeks: 'weeks',
    months: 'months',
};
/** Presentation-only flavor scaffolding — not canonical business logic. */
exports.SESSION_TIME_ADVANCE_PRESETS = [
    { id: 'short_rest', label: 'Short rest', amount: 8, unit: 'hours' },
    { id: 'travel_day', label: 'Travel day', amount: 1, unit: 'days' },
    { id: 'downtime', label: 'Downtime', amount: 3, unit: 'days' },
    { id: 'week_at_sea', label: 'Week at sea', amount: 1, unit: 'weeks' },
    { id: 'long_voyage', label: 'Long voyage', amount: 2, unit: 'weeks' },
    { id: 'month_passes', label: 'Month passes', amount: 1, unit: 'months' },
];
function isTimeAdvanceUnit(value) {
    return (typeof value === 'string' &&
        exports.TIME_ADVANCE_UNITS.includes(value));
}
function isDurationAdvanceUnit(value) {
    return (typeof value === 'string' &&
        exports.DURATION_ADVANCE_UNITS.includes(value));
}
//# sourceMappingURL=timeAdvanceUnits.js.map