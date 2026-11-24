import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { utcDateBucket } from './userWritingDailyRollup.js';
import {
  assembleRollupHabitsFromRows,
  computeFavoriteHour,
  computeStreak,
  isActiveDay,
} from './buildRollupHabits.js';

function row(input: {
  date: string;
  wordsAdded?: number;
  editsCount?: number;
  sessionCount?: number;
  sessionMinutes?: number;
  peakHourUtc?: number | null;
  substantialRevisions?: number;
}) {
  return {
    date: new Date(input.date),
    wordsAdded: input.wordsAdded ?? 0,
    editsCount: input.editsCount ?? 0,
    sessionCount: input.sessionCount ?? 0,
    sessionMinutes: input.sessionMinutes ?? 0,
    peakHourUtc: input.peakHourUtc ?? null,
    substantialRevisions: input.substantialRevisions ?? 0,
  };
}

describe('buildRollupHabits formulas', () => {
  it('treats edits, words, or sessions as an active day', () => {
    assert.equal(isActiveDay({ editsCount: 1, wordsAdded: 0, sessionCount: 0 }), true);
    assert.equal(isActiveDay({ editsCount: 0, wordsAdded: 4, sessionCount: 0 }), true);
    assert.equal(isActiveDay({ editsCount: 0, wordsAdded: 0, sessionCount: 1 }), true);
    assert.equal(isActiveDay({ editsCount: 0, wordsAdded: 0, sessionCount: 0 }), false);
  });

  it('walks consecutive UTC days backward from today for the streak', () => {
    const today = new Date('2026-06-15T18:00:00.000Z');
    const rows = [
      row({ date: '2026-06-15T00:00:00.000Z', wordsAdded: 10 }),
      row({ date: '2026-06-14T00:00:00.000Z', sessionCount: 1 }),
      row({ date: '2026-06-13T00:00:00.000Z', editsCount: 1 }),
      row({ date: '2026-06-11T00:00:00.000Z', wordsAdded: 50 }),
    ];
    assert.equal(computeStreak(rows, today), 3);
  });

  it('returns a zero streak when today is inactive even if yesterday was active', () => {
    const today = new Date('2026-06-15T18:00:00.000Z');
    const rows = [row({ date: '2026-06-14T00:00:00.000Z', wordsAdded: 10 })];
    assert.equal(computeStreak(rows, today), 0);
  });

  it('weights favorite hour by session minutes', () => {
    const hour = computeFavoriteHour([
      { peakHourUtc: 8, sessionMinutes: 10 },
      { peakHourUtc: 21, sessionMinutes: 40 },
      { peakHourUtc: 8, sessionMinutes: 15 },
    ]);
    assert.equal(hour, 21);
  });

  it('ignores rows without session minutes when choosing a favorite hour', () => {
    assert.equal(
      computeFavoriteHour([{ peakHourUtc: 3, sessionMinutes: 0 }]),
      null,
    );
  });

  it('sums 30-day words and substantial revisions and computes cadence over 30', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const habits = assembleRollupHabitsFromRows(
      [
        row({
          date: utcDateBucket(now).toISOString(),
          wordsAdded: 100,
          substantialRevisions: 2,
          sessionCount: 1,
          sessionMinutes: 30,
          peakHourUtc: 14,
        }),
        row({
          date: '2026-06-01T00:00:00.000Z',
          wordsAdded: 25,
          editsCount: 1,
        }),
        row({
          date: '2026-02-01T00:00:00.000Z',
          wordsAdded: 999,
        }),
      ],
      now,
    );
    assert.equal(habits.hasRollupData, true);
    assert.equal(habits.wordsAdded30d, 125);
    assert.equal(habits.substantialRevisions30d, 2);
    assert.equal(habits.writingCadence, Math.round((2 / 30) * 7 * 10) / 10);
    assert.equal(habits.favoriteWritingHour, 14);
    assert.equal(habits.writingStreak, 1);
  });

  it('marks habits untracked when there are no rollup rows', () => {
    const habits = assembleRollupHabitsFromRows([], new Date());
    assert.equal(habits.hasRollupData, false);
    assert.equal(habits.wordsAdded30d, 0);
    assert.equal(habits.writingStreak, 0);
    assert.equal(habits.favoriteWritingHour, null);
  });
});
