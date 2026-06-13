import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRelativeEpochLabel } from './relativeEpochLabel.js';

const DAY = 1440n;

test('formatRelativeEpochLabel returns Just now when at or after current', () => {
  assert.equal(formatRelativeEpochLabel('1000', 1000n), 'Just now');
  assert.equal(formatRelativeEpochLabel('1001', 1000n), 'Just now');
});

test('formatRelativeEpochLabel returns Today for same-day events', () => {
  assert.equal(formatRelativeEpochLabel('500', 1000n), 'Today');
});

test('formatRelativeEpochLabel returns day and week labels', () => {
  assert.equal(formatRelativeEpochLabel('0', DAY), '1 day ago');
  assert.equal(formatRelativeEpochLabel('0', DAY * 3n), '3 days ago');
  assert.equal(formatRelativeEpochLabel('0', DAY * 7n), '1 week ago');
  assert.equal(formatRelativeEpochLabel('0', DAY * 14n), '2 weeks ago');
});

test('formatRelativeEpochLabel returns month labels', () => {
  assert.equal(formatRelativeEpochLabel('0', DAY * 35n), '1 month ago');
  assert.equal(formatRelativeEpochLabel('0', DAY * 65n), '2 months ago');
});

test('formatRelativeEpochLabel returns null for missing or invalid input', () => {
  assert.equal(formatRelativeEpochLabel(null, 0n), null);
  assert.equal(formatRelativeEpochLabel(undefined, 0n), null);
  assert.equal(formatRelativeEpochLabel('not-a-number', 0n), null);
});
