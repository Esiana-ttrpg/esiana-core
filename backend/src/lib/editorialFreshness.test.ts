import assert from 'node:assert/strict';
import test from 'node:test';
import { formatEditorialFreshness } from './editorialFreshness.js';

const now = new Date('2026-06-01T12:00:00.000Z');

test('formatEditorialFreshness labels recent edits', () => {
  const recent = new Date('2026-05-31T12:00:00.000Z');
  assert.equal(formatEditorialFreshness(recent, now), 'Updated recently');
});

test('formatEditorialFreshness labels weekly expansion', () => {
  const threeDaysAgo = new Date('2026-05-29T12:00:00.000Z');
  assert.equal(formatEditorialFreshness(threeDaysAgo, now), 'Expanded this week');
});

test('formatEditorialFreshness labels dormancy', () => {
  const old = new Date('2025-01-01T12:00:00.000Z');
  assert.equal(formatEditorialFreshness(old, now), 'Dormant for over a year');
});
