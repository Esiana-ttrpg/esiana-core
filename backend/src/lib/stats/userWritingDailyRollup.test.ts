import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { utcDateBucket } from './userWritingDailyRollup.js';

describe('userWritingDailyRollup', () => {
  it('buckets timestamps to UTC midnight', () => {
    const at = new Date('2026-06-15T23:45:00.000Z');
    const bucket = utcDateBucket(at);
    assert.equal(bucket.toISOString(), '2026-06-15T00:00:00.000Z');
  });
});
