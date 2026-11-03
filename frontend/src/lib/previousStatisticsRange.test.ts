import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignDailySeriesByMonth,
  possessiveName,
  previousComparableQuery,
} from './previousStatisticsRange';

describe('previousComparableQuery', () => {
  it('aligns incomplete months to corresponding prior-month days', () => {
    const prior = previousComparableQuery({
      mode: 'month',
      // Nov 1 00:00 PDT → Nov 2 afternoon PDT
      start: '2026-11-01T07:00:00.000Z',
      end: '2026-11-02T22:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });
    assert.deepEqual(prior, {
      range: 'custom',
      from: '2026-10-01',
      to: '2026-10-03',
    });
  });

  it('aligns incomplete years to the prior year', () => {
    const prior = previousComparableQuery({
      mode: 'year',
      start: '2026-01-01T08:00:00.000Z',
      end: '2026-11-02T22:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });
    assert.deepEqual(prior, {
      range: 'custom',
      from: '2025-01-01',
      to: '2025-11-03',
    });
  });

  it('returns null for all-time', () => {
    assert.equal(
      previousComparableQuery({
        mode: 'all_time',
        start: null,
        end: '2026-11-02T22:00:00.000Z',
        timeZone: 'UTC',
      }),
      null,
    );
  });

  it('measures custom windows in civil days, not elapsed ms', () => {
    // Inclusive Oct 1–3 → exclusive end Oct 4 00:00 PDT (3 civil days).
    const prior = previousComparableQuery({
      mode: 'custom',
      start: '2026-10-01T07:00:00.000Z',
      end: '2026-10-04T07:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });
    assert.deepEqual(prior, {
      range: 'custom',
      from: '2026-09-28',
      to: '2026-10-01',
    });
  });

  it('uses last included day when end is exclusive midnight', () => {
    const prior = previousComparableQuery({
      mode: 'month',
      start: '2026-11-01T07:00:00.000Z',
      end: '2026-11-03T07:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });
    assert.deepEqual(prior, {
      range: 'custom',
      from: '2026-10-01',
      to: '2026-10-03',
    });
  });
});

describe('possessiveName', () => {
  it('adds ’s or only an apostrophe for names ending in s', () => {
    assert.equal(possessiveName('Allison'), "Allison's");
    assert.equal(possessiveName('James'), "James'");
  });
});

describe('alignDailySeriesByMonth', () => {
  it('sums daily values into months for year comparison', () => {
    const rows = alignDailySeriesByMonth(
      [
        { date: '2026-01-10', value: 3 },
        { date: '2026-01-11', value: 2 },
        { date: '2026-02-01', value: 5 },
      ],
      [
        { date: '2025-01-04', value: 1 },
        { date: '2025-02-09', value: 4 },
      ],
      'en',
    );
    assert.equal(rows[0]?.current, 5);
    assert.equal(rows[0]?.previous, 1);
    assert.equal(rows[1]?.current, 5);
    assert.equal(rows[1]?.previous, 4);
  });
});
