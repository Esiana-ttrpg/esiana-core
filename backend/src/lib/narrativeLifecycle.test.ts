import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NarrativeLifecycleStates,
  allowedLifecycleTransitions,
  assertLifecycleTransition,
  lifecycleToPublishedQuestStatus,
  projectNarrativeLifecycle,
  publishedQuestStatusToLifecycleHint,
  publishedQuestStatusToLifecycleTarget,
  NarrativeLifecycleTransitionError,
  initialQuestLifecycleFromWikiVisibility,
} from '../../../shared/narrativeLifecycle.js';

test('allowedLifecycleTransitions matches matrix', () => {
  assert.deepEqual(allowedLifecycleTransitions(NarrativeLifecycleStates.LOCKED), [
    'DISCOVERED',
    'ACTIVE',
  ]);
  assert.deepEqual(
    allowedLifecycleTransitions(NarrativeLifecycleStates.DISCOVERED),
    ['ACTIVE', 'FAILED'],
  );
  assert.deepEqual(allowedLifecycleTransitions(NarrativeLifecycleStates.COMPLETED), []);
});

test('assertLifecycleTransition throws on invalid move', () => {
  assert.throws(
    () =>
      assertLifecycleTransition(
        NarrativeLifecycleStates.COMPLETED,
        NarrativeLifecycleStates.ACTIVE,
      ),
    (err: unknown) => {
      assert.ok(err instanceof NarrativeLifecycleTransitionError);
      assert.equal(err.fromState, 'COMPLETED');
      assert.equal(err.toState, 'ACTIVE');
      return true;
    },
  );
});

test('projectNarrativeLifecycle hides LOCKED from party', () => {
  const party = projectNarrativeLifecycle(NarrativeLifecycleStates.LOCKED, {
    perspective: 'party',
  });
  assert.equal(party.visible, null);
  assert.equal(party.partyVisible, false);

  const gm = projectNarrativeLifecycle(NarrativeLifecycleStates.LOCKED, {
    perspective: 'elevated',
  });
  assert.equal(gm.visible, 'LOCKED');
  assert.equal(gm.partyVisible, false);
});

test('lifecycleToPublishedQuestStatus mapping', () => {
  assert.equal(
    lifecycleToPublishedQuestStatus(NarrativeLifecycleStates.DISCOVERED),
    'AVAILABLE',
  );
  assert.equal(
    lifecycleToPublishedQuestStatus(NarrativeLifecycleStates.ACTIVE),
    'ACTIVE',
  );
  assert.equal(
    lifecycleToPublishedQuestStatus(NarrativeLifecycleStates.FAILED, {
      preserveAbandoned: true,
    }),
    'ABANDONED',
  );
});

test('publishedQuestStatusToLifecycleHint backfill', () => {
  assert.equal(publishedQuestStatusToLifecycleHint('ACTIVE'), 'ACTIVE');
  assert.equal(publishedQuestStatusToLifecycleHint('ABANDONED'), 'FAILED');
  assert.equal(publishedQuestStatusToLifecycleHint('AVAILABLE'), 'DISCOVERED');
});

test('publishedQuestStatusToLifecycleTarget for kanban', () => {
  assert.equal(
    publishedQuestStatusToLifecycleTarget(
      'AVAILABLE',
      NarrativeLifecycleStates.LOCKED,
    ),
    'DISCOVERED',
  );
  assert.equal(
    publishedQuestStatusToLifecycleTarget(
      'ACTIVE',
      NarrativeLifecycleStates.DISCOVERED,
    ),
    'ACTIVE',
  );
});

test('initialQuestLifecycleFromWikiVisibility seeds from wiki ACL at create', () => {
  assert.equal(
    initialQuestLifecycleFromWikiVisibility({ visibility: 'Party' }),
    NarrativeLifecycleStates.DISCOVERED,
  );
  assert.equal(
    initialQuestLifecycleFromWikiVisibility({ visibility: 'Public' }),
    NarrativeLifecycleStates.DISCOVERED,
  );
  assert.equal(
    initialQuestLifecycleFromWikiVisibility({ visibility: 'DM_Only' }),
    NarrativeLifecycleStates.LOCKED,
  );
});

test('initialQuestLifecycleFromWikiVisibility honors non-available quest status hints', () => {
  assert.equal(
    initialQuestLifecycleFromWikiVisibility({
      visibility: 'Party',
      questStatus: 'ACTIVE',
    }),
    NarrativeLifecycleStates.ACTIVE,
  );
});
