import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceProjectElapsed, emptyDowntimeProjectFields } from '../../../shared/projectMetadata.js';

test('advanceProjectElapsed completes zero-duration projects on first tick', () => {
  const fields = {
    ...emptyDowntimeProjectFields(),
    status: 'ACTIVE' as const,
    durationTotalMinutes: 0n,
  };
  const result = advanceProjectElapsed(fields, 60n, 60n);
  assert.equal(result.completed, true);
  assert.equal(result.fields.status, 'COMPLETED');
});

test('advanceProjectElapsed is noop for PLANNED projects', () => {
  const fields = {
    ...emptyDowntimeProjectFields(),
    status: 'PLANNED' as const,
    durationTotalMinutes: 1000n,
  };
  const result = advanceProjectElapsed(fields, 500n, 500n);
  assert.equal(result.progressed, false);
  assert.equal(result.stalled, false);
  assert.equal(result.fields.durationElapsedMinutes, 0n);
});
