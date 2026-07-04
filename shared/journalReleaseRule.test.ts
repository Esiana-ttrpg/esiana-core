import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectRuleReferences,
  criteriaSubsystem,
  evaluateReleaseRule,
  type JournalReleaseSnapshot,
  type ReleaseNode,
} from './journalReleaseRule.ts';
import {
  computeContentReadiness,
  toPerceivedState,
} from './journalPublication.ts';

function baseSnapshot(overrides: Partial<JournalReleaseSnapshot> = {}): JournalReleaseSnapshot {
  return {
    currentEpochMinute: '1000',
    currentSession: 3,
    currentSeasonId: null,
    nowIso: '2026-07-03T00:00:00.000Z',
    sessions: {},
    events: {},
    worldEventSuggestions: {},
    characters: {},
    quests: {},
    pages: {},
    projects: {},
    havens: {},
    factions: {},
    regions: {},
    ...overrides,
  };
}

function criterion(node: ReleaseNode['criteria']): ReleaseNode {
  return { type: 'criteria', criteria: node };
}

test('null rule is needs_plan', () => {
  const { planState, diagnostics } = evaluateReleaseRule(null, baseSnapshot());
  assert.equal(planState, 'needs_plan');
  assert.equal(diagnostics.length, 0);
});

test('empty group is needs_plan', () => {
  const rule: ReleaseNode = { type: 'group', operator: 'ALL', children: [] };
  assert.equal(evaluateReleaseRule(rule, baseSnapshot()).planState, 'needs_plan');
});

test('satisfied single criterion is ready', () => {
  const rule = criterion({ kind: 'session_number_at_least', value: 3 });
  assert.equal(evaluateReleaseRule(rule, baseSnapshot()).planState, 'ready');
});

test('unsatisfied single criterion is pending', () => {
  const rule = criterion({ kind: 'session_number_at_least', value: 9 });
  const { planState, diagnostics } = evaluateReleaseRule(rule, baseSnapshot());
  assert.equal(planState, 'pending');
  assert.equal(diagnostics[0]?.outcome, 'unmet');
});

test('missing reference is blocked with reason + label fallback', () => {
  const rule = criterion({
    kind: 'character_status_is',
    pageId: 'char-1',
    status: 'DEAD',
    label: 'King Aldric',
  });
  const snapshot = baseSnapshot({
    characters: { 'char-1': { status: 'missing', missingReason: 'deleted' } },
  });
  const { planState, diagnostics } = evaluateReleaseRule(rule, snapshot);
  assert.equal(planState, 'blocked');
  assert.equal(diagnostics[0]?.outcome, 'missing');
  assert.equal(diagnostics[0]?.missingReason, 'deleted');
  assert.equal(diagnostics[0]?.message.key, 'journal.diag.missing_deleted');
  assert.equal(diagnostics[0]?.message.params?.label, 'King Aldric');
});

test('restricted reference is distinguished from deleted', () => {
  const rule = criterion({ kind: 'event_resolved', eventId: 'evt-1' });
  const snapshot = baseSnapshot({
    events: { 'evt-1': { status: 'missing', missingReason: 'restricted' } },
  });
  const { diagnostics } = evaluateReleaseRule(rule, snapshot);
  assert.equal(diagnostics[0]?.missingReason, 'restricted');
  assert.equal(diagnostics[0]?.message.key, 'journal.diag.missing_restricted');
});

test('ALL group requires every child; ANY requires one', () => {
  const met = criterion({ kind: 'session_number_at_least', value: 1 });
  const unmet = criterion({ kind: 'session_number_at_least', value: 99 });

  const all: ReleaseNode = { type: 'group', operator: 'ALL', children: [met, unmet] };
  assert.equal(evaluateReleaseRule(all, baseSnapshot()).planState, 'pending');

  const any: ReleaseNode = { type: 'group', operator: 'ANY', children: [met, unmet] };
  assert.equal(evaluateReleaseRule(any, baseSnapshot()).planState, 'ready');
});

test('nested groups evaluate recursively with correct paths', () => {
  const rule: ReleaseNode = {
    type: 'group',
    operator: 'ALL',
    children: [
      criterion({ kind: 'session_number_at_least', value: 1 }),
      {
        type: 'group',
        operator: 'ANY',
        children: [
          criterion({ kind: 'session_number_at_least', value: 99 }),
          criterion({ kind: 'inworld_date_after', epochMinute: '500', label: '14 Rainfall' }),
        ],
      },
    ],
  };
  const { planState, diagnostics } = evaluateReleaseRule(rule, baseSnapshot());
  assert.equal(planState, 'ready');
  const nestedLeaf = diagnostics.find((d) => d.criteria.kind === 'inworld_date_after');
  assert.deepEqual(nestedLeaf?.path, [1, 1]);
});

test('manual_release never auto-satisfies (stays pending)', () => {
  const rule = criterion({ kind: 'manual_release' });
  assert.equal(evaluateReleaseRule(rule, baseSnapshot()).planState, 'pending');
});

test('session_number_at_least supports comparison operators', () => {
  const equal = criterion({ kind: 'session_number_at_least', value: 3, operator: '=' });
  assert.equal(evaluateReleaseRule(equal, baseSnapshot()).planState, 'ready');

  const notEqual = criterion({ kind: 'session_number_at_least', value: 2, operator: '!=' });
  assert.equal(evaluateReleaseRule(notEqual, baseSnapshot()).planState, 'ready');

  const lessThan = criterion({ kind: 'session_number_at_least', value: 4, operator: '<' });
  assert.equal(evaluateReleaseRule(lessThan, baseSnapshot()).planState, 'ready');
});

test('real_world_date_after supports comparison operators', () => {
  const snapshot = baseSnapshot({ nowIso: '2026-07-03T00:00:00.000Z' });
  const target = '2026-07-03T00:00:00.000Z';

  const greaterOrEqual = criterion({ kind: 'real_world_date_after', isoDate: target, operator: '>=' });
  assert.equal(evaluateReleaseRule(greaterOrEqual, snapshot).planState, 'ready');

  const greater = criterion({ kind: 'real_world_date_after', isoDate: target, operator: '>' });
  assert.equal(evaluateReleaseRule(greater, snapshot).planState, 'pending');

  const less = criterion({ kind: 'real_world_date_after', isoDate: '2026-07-02T23:59:59.000Z', operator: '<' });
  assert.equal(evaluateReleaseRule(less, snapshot).planState, 'pending');
});

test('evaluateReleaseRule accepts ReleaseRuleEnvelope and node-null envelopes', () => {
  const envelope = {
    trigger: { kind: 'SessionStarted' },
    node: criterion({ kind: 'session_number_at_least', value: 3 }),
  };
  assert.equal(evaluateReleaseRule(envelope, baseSnapshot()).planState, 'ready');

  const emptyEnvelope = { trigger: null, node: null };
  assert.equal(evaluateReleaseRule(emptyEnvelope, baseSnapshot()).planState, 'needs_plan');
});

test('page_visibility_at_least respects the ladder', () => {
  const rule = criterion({ kind: 'page_visibility_at_least', pageId: 'p1', level: 'party' });
  const partySnap = baseSnapshot({
    pages: { p1: { status: 'ok', value: { revealed: true, visibilityLevel: 'party' } } },
  });
  assert.equal(evaluateReleaseRule(rule, partySnap).planState, 'ready');
  const dmSnap = baseSnapshot({
    pages: { p1: { status: 'ok', value: { revealed: false, visibilityLevel: 'dm' } } },
  });
  assert.equal(evaluateReleaseRule(rule, dmSnap).planState, 'pending');
});

test('haven_scale_at_least uses ordinal comparison', () => {
  const rule = criterion({ kind: 'haven_scale_at_least', pageId: 'h1', scale: 'sprawling' });
  const big = baseSnapshot({
    havens: { h1: { status: 'ok', value: { status: 'prosperous', scale: 'legendary' } } },
  });
  assert.equal(evaluateReleaseRule(rule, big).planState, 'ready');
  const small = baseSnapshot({
    havens: { h1: { status: 'ok', value: { status: 'prosperous', scale: 'modest' } } },
  });
  assert.equal(evaluateReleaseRule(rule, small).planState, 'pending');
});

test('criteriaSubsystem maps every kind to its owner', () => {
  assert.equal(criteriaSubsystem('session_completed'), 'chronology');
  assert.equal(criteriaSubsystem('character_status_is'), 'narrative');
  assert.equal(criteriaSubsystem('page_revealed'), 'discovery');
  assert.equal(criteriaSubsystem('haven_scale_at_least'), 'downtime');
  assert.equal(criteriaSubsystem('faction_reputation_at_least'), 'reputation');
  assert.equal(criteriaSubsystem('real_world_date_after'), 'publishing');
  assert.equal(criteriaSubsystem('manual_release'), 'manual');
});

test('collectRuleReferences gathers only referenced ids', () => {
  const rule: ReleaseNode = {
    type: 'group',
    operator: 'ALL',
    children: [
      criterion({ kind: 'character_status_is', pageId: 'c1', status: 'DEAD' }),
      criterion({ kind: 'event_resolved', eventId: 'e1' }),
      criterion({ kind: 'inworld_season_is', seasonId: 'winter' }),
    ],
  };
  const refs = collectRuleReferences(rule);
  assert.deepEqual(refs.characterPageIds, ['c1']);
  assert.deepEqual(refs.eventIds, ['e1']);
  assert.equal(refs.usesSeason, true);
  assert.equal(refs.usesRealWorldClock, false);
});

test('content readiness gate is separate from rule state', () => {
  assert.equal(computeContentReadiness({ title: 'X', contentMarkdown: 'body' }), 'ready');
  assert.equal(computeContentReadiness({ title: 'X', contentMarkdown: '' }), 'empty');
  assert.equal(computeContentReadiness({ title: '', contentMarkdown: 'body' }), 'empty');
  assert.equal(
    computeContentReadiness({ title: 'X', contentBlocks: [{ type: 'p' }] }),
    'ready',
  );
});

test('toPerceivedState folds ready into pending', () => {
  assert.equal(toPerceivedState({ planState: 'needs_plan' }), 'needs_plan');
  assert.equal(toPerceivedState({ planState: 'blocked' }), 'blocked');
  assert.equal(toPerceivedState({ planState: 'pending' }), 'pending');
  assert.equal(toPerceivedState({ planState: 'ready' }), 'pending');
});
