import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assemblePeriodHabits } from './assemblePeriodHabits.js';
import { zonedTimeToUtc } from './zonedTime.js';

describe('assemblePeriodHabits', () => {
  it('regroups the same UTC timestamps when the reporting timezone changes', () => {
    const now = new Date('2026-06-15T18:00:00.000Z');
    const lateEveningUtc = new Date('2026-06-15T03:30:00.000Z');
    const points = [
      {
        at: lateEveningUtc,
        wordsAdded: 40,
        editsCount: 1,
        sessionCount: 1,
        sessionMinutes: 20,
        substantialRevisions: 0,
      },
    ];

    const utcHabits = assemblePeriodHabits(points, {
      now,
      timeZone: 'UTC',
      windowStart: new Date('2026-05-16T00:00:00.000Z'),
      streakLookbackStart: new Date('2026-02-15T00:00:00.000Z'),
    });
    const nyHabits = assemblePeriodHabits(points, {
      now,
      timeZone: 'America/New_York',
      windowStart: zonedTimeToUtc('America/New_York', 2026, 5, 16),
      streakLookbackStart: zonedTimeToUtc('America/New_York', 2026, 2, 15),
    });

    assert.equal(utcHabits.favoriteWritingHour, 3);
    assert.equal(nyHabits.favoriteWritingHour, 23);
    assert.equal(utcHabits.wordsAdded, 40);
    assert.equal(nyHabits.wordsAdded, 40);
  });

  it('counts a timezone-local streak from today backward', () => {
    const now = new Date('2026-06-15T18:00:00.000Z');
    const points = [
      {
        at: new Date('2026-06-15T16:00:00.000Z'),
        wordsAdded: 10,
        editsCount: 1,
        sessionCount: 0,
        sessionMinutes: 0,
        substantialRevisions: 0,
      },
      {
        at: new Date('2026-06-14T16:00:00.000Z'),
        wordsAdded: 0,
        editsCount: 0,
        sessionCount: 1,
        sessionMinutes: 15,
        substantialRevisions: 0,
      },
    ];
    const habits = assemblePeriodHabits(points, {
      now,
      timeZone: 'UTC',
      windowStart: new Date('2026-05-16T00:00:00.000Z'),
      streakLookbackStart: new Date('2026-02-15T00:00:00.000Z'),
    });
    assert.equal(habits.writingStreak, 2);
    assert.equal(habits.writingCadence, Math.round((2 / 30) * 7 * 10) / 10);
  });
});
