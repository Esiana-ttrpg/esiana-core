import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeNextCadenceOccurrence,
  datetimeLocalValueToIsoStrict,
  isOneShotCampaignFormat,
  inferCadenceDays,
  isSameCadenceOccurrence,
  mergeProjectedWithPersisted,
  parseWeekday,
  projectCadenceOccurrencesInRange,
  buildProjectedOccurrenceId,
  CADENCE_OCCURRENCE_MATCH_TOLERANCE_MS,
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

test('biweekly from previous planned start stays on 14-day grid across sweep offsets', () => {
  // Previous: Saturday 2026-10-10 18:00 UTC
  const previous = new Date('2026-10-10T18:00:00.000Z');
  const expectedNext = '2026-10-24T18:00:00.000Z';
  const expectedFollowing = '2026-11-07T18:00:00.000Z';

  const offsets = [
    new Date('2026-10-11T00:00:00.000Z'), // 1 day after previous
    new Date('2026-10-17T12:00:00.000Z'), // mid-interval
    new Date('2026-10-23T23:00:00.000Z'), // just before next
  ];

  for (const after of offsets) {
    const next = computeNextCadenceOccurrence({
      scheduleFrequency: 'Biweekly',
      scheduleDay: 'Saturday',
      scheduleTime: '6:00 PM',
      scheduleTimezone: 'UTC',
      after,
      previousPlannedStartAt: previous,
    });
    assert.ok(next, `expected next for after=${after.toISOString()}`);
    assert.equal(next!.toISOString(), expectedNext);
  }

  const afterNextSlot = new Date('2026-10-25T00:00:00.000Z');
  const following = computeNextCadenceOccurrence({
    scheduleFrequency: 'Biweekly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'UTC',
    after: afterNextSlot,
    previousPlannedStartAt: previous,
  });
  assert.ok(following);
  assert.equal(following!.toISOString(), expectedFollowing);
});

test('previousPlannedStartAt aligns to configured weekday when they differ', () => {
  // Previous session was Wednesday; cadence is now Saturday.
  const previous = new Date('2026-10-07T18:00:00.000Z'); // Wednesday
  const after = new Date('2026-10-08T00:00:00.000Z');

  const next = computeNextCadenceOccurrence({
    scheduleFrequency: 'Biweekly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'UTC',
    after,
    previousPlannedStartAt: previous,
  });
  assert.ok(next);
  // Align Wed Oct 7 → Sat Oct 10, then return that slot (still after `after`).
  assert.equal(next!.toISOString(), '2026-10-10T18:00:00.000Z');
  assert.equal(next!.getUTCDay(), 6); // Saturday

  const afterAligned = new Date('2026-10-11T00:00:00.000Z');
  const following = computeNextCadenceOccurrence({
    scheduleFrequency: 'Biweekly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'UTC',
    after: afterAligned,
    previousPlannedStartAt: previous,
  });
  assert.ok(following);
  // Next biweekly step from aligned Saturday Oct 10 → Oct 24.
  assert.equal(following!.toISOString(), '2026-10-24T18:00:00.000Z');
  assert.equal(following!.getUTCDay(), 6);
});

test('datetimeLocalValueToIsoStrict rejects DST spring-forward gap', () => {
  // America/Los_Angeles springs forward 2026-03-08; 02:30 never exists.
  const result = datetimeLocalValueToIsoStrict(
    '2026-03-08T02:30',
    'America/Los_Angeles',
  );
  assert.equal(result, null);
});

test('datetimeLocalValueToIsoStrict accepts valid wall time', () => {
  const result = datetimeLocalValueToIsoStrict(
    '2026-10-03T18:00',
    'America/Los_Angeles',
  );
  assert.equal(result, '2026-10-04T01:00:00.000Z');
});

test('projectCadenceOccurrencesInRange returns weekly slots in month only', () => {
  const rangeStart = new Date('2026-10-01T00:00:00.000Z');
  const rangeEnd = new Date('2026-10-31T23:59:59.999Z');
  const slots = projectCadenceOccurrencesInRange({
    scheduleFrequency: 'Weekly',
    scheduleDay: 'Saturday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'UTC',
    rangeStart,
    rangeEnd,
  });
  assert.ok(slots.length >= 4);
  for (const slot of slots) {
    assert.ok(slot.getTime() >= rangeStart.getTime());
    assert.ok(slot.getTime() <= rangeEnd.getTime());
    assert.equal(slot.getUTCDay(), 6);
  }
  // May is outside October — no May slots.
  assert.ok(slots.every((s) => s.toISOString().startsWith('2026-10')));
});

test('mergeProjectedWithPersisted keeps same-day manual at different time', () => {
  const projected = [
    new Date('2026-10-17T18:00:00.000Z'), // cadence Saturday 6pm
    new Date('2026-10-24T18:00:00.000Z'),
  ];
  // Manual session earlier same day as first slot — different occurrence.
  const persisted = [{ plannedStartAt: new Date('2026-10-17T14:00:00.000Z') }];
  const remaining = mergeProjectedWithPersisted({ projected, persisted });
  assert.equal(remaining.length, 2);
  assert.equal(remaining[0]!.toISOString(), '2026-10-17T18:00:00.000Z');
});

test('mergeProjectedWithPersisted suppresses matching skipped occurrence', () => {
  const projected = [
    new Date('2026-10-17T18:00:00.000Z'),
    new Date('2026-10-24T18:00:00.000Z'),
  ];
  const persisted = [{ plannedStartAt: new Date('2026-10-17T18:05:00.000Z') }]; // within 15m
  const remaining = mergeProjectedWithPersisted({ projected, persisted });
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0]!.toISOString(), '2026-10-24T18:00:00.000Z');
  assert.ok(
    isSameCadenceOccurrence(
      new Date('2026-10-17T18:00:00.000Z'),
      new Date('2026-10-17T18:05:00.000Z'),
      CADENCE_OCCURRENCE_MATCH_TOLERANCE_MS,
    ),
  );
});

test('buildProjectedOccurrenceId is deterministic', () => {
  const id = buildProjectedOccurrenceId(
    'camp_1',
    new Date('2026-10-24T18:00:00.000Z'),
  );
  assert.equal(id, 'projected:camp_1:2026-10-24T18:00:00.000Z');
});
