import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceCalendarByMonths,
  calendarEpochMinuteForDate,
  convertEpochToCalendarState,
} from './timeEngine.js';

const variableMonthsCalendar = {
  epochOffset: 0n,
  weekdays: [{ name: 'Mon', length: 1 }],
  months: [
    { name: 'Long', length: 31, type: 'standard' as const },
    { name: 'Short', length: 28, type: 'standard' as const },
    { name: 'Mid', length: 30, type: 'standard' as const },
  ],
  seasons: [],
  moons: [],
  leapDays: [],
};

test('advanceCalendarByMonths clamps day-of-month', () => {
  const start = calendarEpochMinuteForDate(variableMonthsCalendar, 1, 0, 31);
  const shifted = advanceCalendarByMonths(start, variableMonthsCalendar, 1);
  assert.equal(shifted.clampedDay, true);
  assert.equal(shifted.requestedDay, 31);
  assert.equal(shifted.resolvedDay, 28);
  assert.equal(shifted.nextCalendarState.monthIndex, 1);
  assert.equal(shifted.nextCalendarState.day, 28);
});

test('advanceCalendarByMonths preserves time-of-day', () => {
  const dayStart = calendarEpochMinuteForDate(variableMonthsCalendar, 1, 0, 10);
  const start = dayStart + 17n * 60n + 42n;
  const shifted = advanceCalendarByMonths(start, variableMonthsCalendar, 1);
  assert.equal(shifted.nextCalendarState.hour, 17);
  assert.equal(shifted.nextCalendarState.minute, 42);
});

test('advanceCalendarByMonths actualMinuteDelta matches epoch diff', () => {
  const start = calendarEpochMinuteForDate(variableMonthsCalendar, 1, 1, 15);
  const shifted = advanceCalendarByMonths(start, variableMonthsCalendar, 2);
  assert.equal(shifted.actualMinuteDelta, shifted.nextEpochMinute - start);
  assert.equal(shifted.nextCalendarState.monthIndex, 0);
  assert.equal(shifted.nextCalendarState.year, 2);
});

test('advanceCalendarByMonths populates previous and next states', () => {
  const start = calendarEpochMinuteForDate(variableMonthsCalendar, 1, 0, 5);
  const shifted = advanceCalendarByMonths(start, variableMonthsCalendar, 1);
  assert.deepEqual(
    shifted.previousCalendarState,
    convertEpochToCalendarState(start, variableMonthsCalendar),
  );
  assert.deepEqual(
    shifted.nextCalendarState,
    convertEpochToCalendarState(shifted.nextEpochMinute, variableMonthsCalendar),
  );
});
