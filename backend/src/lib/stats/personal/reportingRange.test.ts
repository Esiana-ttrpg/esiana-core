import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStatisticsRange, StatisticsRangeError } from './reportingRange.js';

describe('resolveStatisticsRange', () => {
  const now = new Date('2026-06-15T18:00:00.000Z');

  it('does not fabricate a lifetime start', () => {
    const range = resolveStatisticsRange({
      mode: 'all_time',
      timeZone: 'America/Chicago',
      now,
    });
    assert.equal(range.start, null);
    assert.equal(range.end.toISOString(), now.toISOString());
  });

  it('uses half-open year bounds in the reporting timezone', () => {
    const range = resolveStatisticsRange({
      mode: 'year',
      timeZone: 'America/New_York',
      now,
      from: '2025',
    });
    assert.equal(range.start?.toISOString(), '2025-01-01T05:00:00.000Z');
    assert.equal(range.end.toISOString(), '2026-01-01T05:00:00.000Z');
  });

  it('clamps the current month to now', () => {
    const range = resolveStatisticsRange({
      mode: 'month',
      timeZone: 'UTC',
      now,
    });
    assert.equal(range.start?.toISOString(), '2026-06-01T00:00:00.000Z');
    assert.equal(range.end.toISOString(), now.toISOString());
  });

  it('treats custom to as an exclusive calendar date', () => {
    const range = resolveStatisticsRange({
      mode: 'custom',
      timeZone: 'UTC',
      now,
      from: '2026-02-01',
      to: '2026-03-01',
    });
    assert.equal(range.start?.toISOString(), '2026-02-01T00:00:00.000Z');
    assert.equal(range.end.toISOString(), '2026-03-01T00:00:00.000Z');
  });

  it('rejects an inverted custom range', () => {
    assert.throws(
      () =>
        resolveStatisticsRange({
          mode: 'custom',
          timeZone: 'UTC',
          now,
          from: '2026-03-01',
          to: '2026-02-01',
        }),
      StatisticsRangeError,
    );
  });
});
