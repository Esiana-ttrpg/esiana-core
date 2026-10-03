import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDateInVacationRange,
  parseVacationDateInput,
  resolveAttendanceMemberLabel,
  resolveMaterializedSessionIdentity,
  toVacationDateIso,
} from './userScheduleService.js';
import {
  mergeProjectedWithPersisted,
  projectCadenceOccurrencesInRange,
} from '../../../shared/campaignScheduleCadence.js';

test('resolveAttendanceMemberLabel prefers campaign character', () => {
  assert.equal(
    resolveAttendanceMemberLabel({
      user: { email: 'belle@example.com', displayName: 'Belle Account' },
      identityPageTitle: 'Belle',
      ownedCharacterCount: 1,
    }),
    'Belle',
  );
});

test('resolveAttendanceMemberLabel falls back display then username', () => {
  assert.equal(
    resolveAttendanceMemberLabel({
      user: { email: 'eric@example.com', displayName: 'Eric' },
      identityPageTitle: null,
      ownedCharacterCount: 0,
    }),
    'Eric',
  );
  assert.equal(
    resolveAttendanceMemberLabel({
      user: { email: 'sebastian@example.com', displayName: null },
      identityPageTitle: null,
      ownedCharacterCount: 0,
    }),
    'sebastian',
  );
});

test('resolveAttendanceMemberLabel uses account identity for multi-PC', () => {
  assert.equal(
    resolveAttendanceMemberLabel({
      user: { email: 'multi@example.com', displayName: 'Alex' },
      identityPageTitle: 'Warrior',
      ownedCharacterCount: 2,
    }),
    'Alex',
  );
});

test('session identity ignores projected slots', () => {
  const materializedHistory = [
    {
      timelinePointId: 'tp-17',
      sequenceOrder: 17,
      status: 'COMPLETED',
      plannedStartAt: new Date('2026-10-07T18:00:00.000Z'),
      campaignId: 'camp-1',
      campaignHandle: 'ashes',
    },
    {
      timelinePointId: 'tp-18',
      sequenceOrder: 18,
      status: 'PUBLISHED',
      plannedStartAt: new Date('2026-10-21T18:00:00.000Z'),
      campaignId: 'camp-1',
      campaignHandle: 'ashes',
    },
  ];

  const identity = resolveMaterializedSessionIdentity({
    current: {
      timelinePointId: 'tp-18',
      sequenceOrder: 18,
      campaignId: 'camp-1',
    },
    materializedHistory,
  });

  assert.equal(identity.sessionNumber, 18);
  assert.equal(identity.previousSession?.sessionNumber, 17);
  assert.equal(identity.previousSession?.deepLinkPath, '/campaigns/ashes/notes/tp-17');

  // Dense projection must not change identity — we never pass projected into the helper.
  const projected = projectCadenceOccurrencesInRange({
    scheduleFrequency: 'Weekly',
    scheduleDay: 'Wednesday',
    scheduleTime: '6:00 PM',
    scheduleTimezone: 'UTC',
    rangeStart: new Date('2026-10-01T00:00:00.000Z'),
    rangeEnd: new Date('2026-10-31T23:59:59.999Z'),
  });
  assert.ok(projected.length > 2);
  const remaining = mergeProjectedWithPersisted({
    projected,
    persisted: materializedHistory
      .filter((r) => r.plannedStartAt)
      .map((r) => ({ plannedStartAt: r.plannedStartAt! })),
  });
  assert.ok(remaining.length >= 1);

  const identityAfterProjection = resolveMaterializedSessionIdentity({
    current: {
      timelinePointId: 'tp-18',
      sequenceOrder: 18,
      campaignId: 'camp-1',
    },
    materializedHistory,
  });
  assert.deepEqual(identityAfterProjection, identity);
});

test('skipped sessions are not previousSession', () => {
  const identity = resolveMaterializedSessionIdentity({
    current: {
      timelinePointId: 'tp-19',
      sequenceOrder: 19,
      campaignId: 'camp-1',
    },
    materializedHistory: [
      {
        timelinePointId: 'tp-17',
        sequenceOrder: 17,
        status: 'COMPLETED',
        plannedStartAt: new Date('2026-10-07T18:00:00.000Z'),
        campaignId: 'camp-1',
        campaignHandle: 'ashes',
      },
      {
        timelinePointId: 'tp-18',
        sequenceOrder: 18,
        status: 'SKIPPED',
        plannedStartAt: new Date('2026-10-14T18:00:00.000Z'),
        campaignId: 'camp-1',
        campaignHandle: 'ashes',
      },
    ],
  });
  assert.equal(identity.previousSession?.sessionNumber, 17);
});

test('vacation date helpers are day-level inclusive', () => {
  const start = parseVacationDateInput('2026-10-18');
  const end = parseVacationDateInput('2026-10-26');
  assert.ok(start && end);
  assert.equal(toVacationDateIso(start), '2026-10-18');
  assert.equal(
    isDateInVacationRange(new Date('2026-10-18T23:00:00.000Z'), start, end),
    true,
  );
  assert.equal(
    isDateInVacationRange(new Date('2026-10-27T01:00:00.000Z'), start, end),
    false,
  );
});
