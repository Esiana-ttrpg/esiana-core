import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEventConsequenceId,
  dedupeEventConsequencesById,
  isEventConsequenceActionable,
  parseEventConsequenceSet,
} from './eventConsequence.js';

test('computeEventConsequenceId is stable for same inputs', () => {
  const input = {
    kind: 'quest_hook' as const,
    payload: { mode: 'discover_quest' as const },
    targets: { pageIds: ['quest-a'] },
  };
  const a = computeEventConsequenceId(input);
  const b = computeEventConsequenceId(input);
  assert.equal(a, b);
  assert.match(a, /^ec-[0-9a-f]{8}$/);
});

test('computeEventConsequenceId changes when targets change', () => {
  const base = {
    kind: 'route_change' as const,
    payload: { severity: 'major' as const, reason: 'banditry' as const },
    targets: { locationIds: ['loc-a', 'loc-b'] },
  };
  const a = computeEventConsequenceId(base);
  const b = computeEventConsequenceId({
    ...base,
    targets: { locationIds: ['loc-a', 'loc-c'] },
  });
  assert.notEqual(a, b);
});

test('parseEventConsequenceSet assigns deterministic id when missing', () => {
  const set = parseEventConsequenceSet({
    version: 'event-consequence-v1',
    consequences: [
      {
        kind: 'haven_threat',
        payload: { label: 'Raiders nearby' },
        targets: { havenIds: ['haven-1'] },
      },
    ],
  });
  assert.ok(set);
  assert.equal(set.consequences.length, 1);
  assert.ok(set.consequences[0]?.id);
});

test('dedupeEventConsequencesById keeps complete row over pending duplicate', () => {
  const id = 'ec-abc';
  const result = dedupeEventConsequencesById([
    {
      id,
      kind: 'alter_location',
      payload: {},
      application: { state: 'complete' },
    },
    {
      id,
      kind: 'alter_location',
      payload: {},
      application: { state: 'pending' },
    },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.application?.state, 'complete');
});

test('isEventConsequenceActionable covers pending partial blocked', () => {
  assert.equal(
    isEventConsequenceActionable({ id: '1', kind: 'quest_hook', payload: { mode: 'open_thread' } }),
    true,
  );
  assert.equal(
    isEventConsequenceActionable({
      id: '2',
      kind: 'quest_hook',
      payload: { mode: 'open_thread' },
      application: { state: 'complete' },
    }),
    false,
  );
});
