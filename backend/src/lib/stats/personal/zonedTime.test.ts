import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDateKey,
  hourInTimeZone,
  startOfZonedDay,
  weekdayMondayIndex,
  zonedTimeToUtc,
} from './zonedTime.js';

describe('zonedTime', () => {
  it('builds half-open America/New_York days that start at 05:00 UTC in January', () => {
    const start = zonedTimeToUtc('America/New_York', 2026, 1, 15);
    assert.equal(start.toISOString(), '2026-01-15T05:00:00.000Z');
    assert.equal(calendarDateKey(start, 'America/New_York'), '2026-01-15');
    assert.equal(
      calendarDateKey(new Date(start.getTime() - 1), 'America/New_York'),
      '2026-01-14',
    );
  });

  it('places a late-evening New York instant on the previous UTC date', () => {
    const at = new Date('2026-06-15T03:30:00.000Z');
    assert.equal(calendarDateKey(at, 'America/New_York'), '2026-06-14');
    assert.equal(hourInTimeZone(at, 'America/New_York'), 23);
    assert.equal(calendarDateKey(at, 'UTC'), '2026-06-15');
  });

  it('uses the start of the reporting day for timezone-aware grouping', () => {
    const at = new Date('2026-06-15T03:30:00.000Z');
    const start = startOfZonedDay(at, 'America/New_York');
    assert.equal(calendarDateKey(start, 'America/New_York'), '2026-06-14');
  });

  it('numbers weekdays Monday-first in the reporting timezone', () => {
    const monday = new Date('2026-06-15T17:00:00.000Z');
    assert.equal(weekdayMondayIndex(monday, 'America/Chicago'), 0);
    assert.equal(weekdayMondayIndex(new Date('2026-06-14T17:00:00.000Z'), 'UTC'), 6);
  });
});
