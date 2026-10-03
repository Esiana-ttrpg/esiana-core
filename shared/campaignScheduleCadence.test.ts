import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeNextCadenceOccurrence,
  isOneShotCampaignFormat,
  inferCadenceDays,
  parseWeekday,
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

test('parseWeekday rejects short prefixes', () => {
  assert.equal(parseWeekday('sa'), null);
  assert.equal(parseWeekday('sat'), 6);
  assert.equal(parseWeekday('Saturday'), 6);
});

test('computeNextCadenceOccurrence returns a future Saturday in timezone', () => {
  const after = new Date('2026-10-01T19:00:00.000Z'); // Thursday afternoon UTC
  const next = computeNextCadenceOccurrence({
    scheduleFrequency: 'Weekly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'America/Los_Angeles',
    after,
  });
  assert.ok(next);
  assert.ok(next! > after);
  // 2026-10-03 18:00 PDT = 2026-10-04 01:00 UTC
  assert.equal(next!.toISOString(), '2026-10-04T01:00:00.000Z');
});

test('computeNextCadenceOccurrence monthly skips same calendar month', () => {
  const after = new Date('2026-10-05T12:00:00.000Z');
  const next = computeNextCadenceOccurrence({
    scheduleFrequency: 'Monthly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'UTC',
    after,
  });
  assert.ok(next);
  // First Saturday after Oct 5 is Oct 10; monthly should advance to November.
  assert.equal(next!.toISOString().slice(0, 7), '2026-11');
});
