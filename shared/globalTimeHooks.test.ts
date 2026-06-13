import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GLOBAL_TIME_HOOK_ORDER,
  computeAdvanceMagnitude,
  truncateHookSummary,
} from './globalTimeHooks.js';

test('GLOBAL_TIME_HOOK_ORDER keeps event_generation last', () => {
  assert.equal(GLOBAL_TIME_HOOK_ORDER.at(-1), 'event_generation');
  assert.equal(GLOBAL_TIME_HOOK_ORDER.length, 6);
});

test('computeAdvanceMagnitude buckets elapsed minutes', () => {
  assert.equal(computeAdvanceMagnitude(30n), 'tiny');
  assert.equal(computeAdvanceMagnitude(59n), 'tiny');
  assert.equal(computeAdvanceMagnitude(60n), 'small');
  assert.equal(computeAdvanceMagnitude(1439n), 'small');
  assert.equal(computeAdvanceMagnitude(1440n), 'medium');
  assert.equal(computeAdvanceMagnitude(1440n * 7n - 1n), 'medium');
  assert.equal(computeAdvanceMagnitude(1440n * 7n), 'large');
  assert.equal(computeAdvanceMagnitude(1440n * 30n - 1n), 'large');
  assert.equal(computeAdvanceMagnitude(1440n * 30n), 'massive');
});

test('truncateHookSummary enforces compact receipts', () => {
  const long = 'x'.repeat(250);
  const truncated = truncateHookSummary(long);
  assert.ok(truncated);
  assert.ok(truncated.length <= 200);
  assert.equal(truncateHookSummary('  hello  '), 'hello');
});
