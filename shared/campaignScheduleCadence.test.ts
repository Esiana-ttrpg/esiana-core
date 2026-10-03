import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeNextCadenceOccurrence,
  isOneShotCampaignFormat,
  inferCadenceDays,
} from './campaignScheduleCadence.js';

test('inferCadenceDays recognizes biweekly and monthly', () => {
  assert.equal(inferCadenceDays('Biweekly'), 14);
  assert.equal(inferCadenceDays('Every 2 weeks'), 14);
  assert.equal(inferCadenceDays('Monthly'), 30);
  assert.equal(inferCadenceDays('Weekly'), 7);
});

test('isOneShotCampaignFormat matches common labels', () => {
  assert.equal(isOneShotCampaignFormat('One-shot'), true);
  assert.equal(isOneShotCampaignFormat('one-shot'), true);
  assert.equal(isOneShotCampaignFormat('Campaign'), false);
  assert.equal(isOneShotCampaignFormat(null), false);
});

test('computeNextCadenceOccurrence returns a future Saturday', () => {
  const after = new Date('2026-10-01T12:00:00'); // Thursday
  const next = computeNextCadenceOccurrence({
    scheduleFrequency: 'Weekly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    after,
  });
  assert.ok(next);
  assert.equal(next!.getDay(), 6);
  assert.ok(next! > after);
});
