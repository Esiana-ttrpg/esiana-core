import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampChronologyDate, dateSeedDiffersFromAnchor } from './chronologyDates.js';
import type { FantasyCalendarLike } from './timeEngine.js';

const twelveMonthCalendar: FantasyCalendarLike = {
  epochOffset: 0n,
  weekdays: [{ name: 'Mon', length: 1 }],
  months: Array.from({ length: 12 }, (_, index) => ({
    name: `Month${index + 1}`,
    length: 30,
    type: 'standard' as const,
  })),
  seasons: [],
  moons: [],
  leapDays: [],
};

const threeMonthCalendar: FantasyCalendarLike = {
  epochOffset: 0n,
  weekdays: [{ name: 'Mon', length: 1 }],
  months: [
    { name: 'A', length: 30, type: 'standard' as const },
    { name: 'B', length: 30, type: 'standard' as const },
    { name: 'C', length: 15, type: 'standard' as const },
  ],
  seasons: [],
  moons: [],
  leapDays: [],
};

describe('dateSeedDiffersFromAnchor', () => {
  it('detects continuation day vs base anchor', () => {
    const differs = dateSeedDiffersFromAnchor(
      { year: 1, month: 0, day: 14 },
      { targetYear: 1, targetMonth: 0, targetDay: 13 },
    );
    assert.equal(differs, true);
  });

  it('returns false when seed matches anchor', () => {
    const differs = dateSeedDiffersFromAnchor(
      { year: 1, month: 0, day: 13 },
      { targetYear: 1, targetMonth: 0, targetDay: 13 },
    );
    assert.equal(differs, false);
  });
});

describe('clampChronologyDate', () => {
  it('floors year at 1', () => {
    const result = clampChronologyDate(twelveMonthCalendar, { year: 0, month: 5, day: 10 });
    assert.equal(result.year, 1);
  });

  it('clamps month index when switching to a shorter calendar profile', () => {
    const fromLong = { year: 1, month: 11, day: 25 };
    const result = clampChronologyDate(threeMonthCalendar, fromLong);
    assert.equal(result.month, 2);
    assert.equal(result.day, 15);
  });

  it('clamps day when target month is shorter', () => {
    const result = clampChronologyDate(threeMonthCalendar, { year: 1, month: 2, day: 30 });
    assert.equal(result.day, 15);
  });
});
