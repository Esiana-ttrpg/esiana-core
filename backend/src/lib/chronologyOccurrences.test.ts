import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calendarEpochMinuteForDate } from './timeEngine.js';
import {
  advanceCalendarDate,
  resolveEventStartCoordinates,
  type CalendarRowForResolve,
} from './chronologyOccurrences.js';

const somerdenLike = {
  epochOffset: 0n,
  weekdays: [{ name: 'Mon', length: 1 }],
  months: Array.from({ length: 12 }, (_, index) => ({
    name: `Month${index + 1}`,
    length: 30,
    type: 'standard' as const,
    climateAspect: 'NEUTRAL' as const,
  })),
  seasons: [],
  moons: [],
  leapDays: [],
};

const intercalaryCalendar = {
  epochOffset: 0n,
  weekdays: [{ name: 'Mon', length: 1 }],
  months: [
    { name: 'A', length: 30, type: 'standard' as const },
    { name: 'Festival', length: 1, type: 'intercalary' as const },
    { name: 'B', length: 30, type: 'standard' as const },
  ],
  seasons: [],
  moons: [],
  leapDays: [],
};

describe('calendarEpochMinuteForDate', () => {
  it('iterates variable month lengths instead of fixed multipliers', () => {
    const epochMonth0Day1 = calendarEpochMinuteForDate(intercalaryCalendar, 1, 0, 1);
    const epochMonth2Day1 = calendarEpochMinuteForDate(intercalaryCalendar, 1, 2, 1);
    const dayDiff = (epochMonth2Day1 - epochMonth0Day1) / (24n * 60n);
    assert.equal(dayDiff, 31n);
  });

  it('sums full prior years iteratively', () => {
    const year2Month0 = calendarEpochMinuteForDate(somerdenLike, 2, 0, 1);
    const year1Month0 = calendarEpochMinuteForDate(somerdenLike, 1, 0, 1);
    const daysBetween = (year2Month0 - year1Month0) / (24n * 60n);
    assert.equal(daysBetween, 360n);
  });
});

const thirtyDayCalendarRow: CalendarRowForResolve = {
  id: 'cal-thirty',
  ...somerdenLike,
};

describe('advanceCalendarDate', () => {
  it('spreads consecutive days across month boundary', () => {
    const day0 = advanceCalendarDate(thirtyDayCalendarRow, 1, 0, 30, 0);
    const day1 = advanceCalendarDate(thirtyDayCalendarRow, 1, 0, 30, 1);
    const day2 = advanceCalendarDate(thirtyDayCalendarRow, 1, 0, 30, 2);

    assert.equal(day0.day, 30);
    assert.equal(day0.month, 0);
    assert.equal(day1.day, 1);
    assert.equal(day1.month, 1);
    assert.equal(day2.day, 2);
    assert.equal(day2.month, 1);
  });

  it('rolls year when advancing past final month', () => {
    const result = advanceCalendarDate(thirtyDayCalendarRow, 1, 11, 30, 2);
    assert.equal(result.year, 2);
    assert.equal(result.month, 0);
    assert.equal(result.day, 2);
  });

  it('returns null when base coordinates are incomplete', () => {
    const result = advanceCalendarDate(thirtyDayCalendarRow, null, 0, 13, 1);
    assert.equal(result.day, null);
  });
});

describe('resolveEventStartCoordinates', () => {
  const calendarRow = {
    id: 'cal-1',
    ...somerdenLike,
  };

  it('prefers targetEpochMinute over stale targetYear', () => {
    const resolved = resolveEventStartCoordinates(
      {
        calendarId: 'cal-1',
        targetYear: 1,
        targetMonth: 0,
        targetDay: 1,
        targetEpochMinute: calendarEpochMinuteForDate(somerdenLike, 4672, 6, 13),
      },
      calendarRow,
      null,
    );
    assert.equal(resolved.year, 4672);
    assert.equal(resolved.month, 6);
    assert.equal(resolved.day, 13);
    assert.equal(resolved.monthName, 'Month7');
  });
});
