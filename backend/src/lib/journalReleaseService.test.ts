import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePublication } from './journalReleaseService.js';
import type { JournalReleaseSnapshot } from '../../../shared/journalReleaseRule.js';

function snapshot(): JournalReleaseSnapshot {
  return {
    currentEpochMinute: '1000',
    currentSession: 5,
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
  };
}

const readyRule = { type: 'criteria', criteria: { kind: 'session_number_at_least', value: 3 } };
const pendingRule = { type: 'criteria', criteria: { kind: 'session_number_at_least', value: 99 } };

test('releasable requires rule ready AND content ready', () => {
  const evaluation = evaluatePublication(
    { title: 'Gazette', contentMarkdown: 'body', contentBlocks: null, releaseRule: readyRule },
    snapshot(),
  );
  assert.equal(evaluation.planState, 'ready');
  assert.equal(evaluation.contentReadiness, 'ready');
  assert.equal(evaluation.releasable, true);
});

test('content gate blocks release even when the rule is satisfied', () => {
  const evaluation = evaluatePublication(
    { title: 'Gazette', contentMarkdown: '', contentBlocks: null, releaseRule: readyRule },
    snapshot(),
  );
  assert.equal(evaluation.planState, 'ready');
  assert.equal(evaluation.contentReadiness, 'empty');
  assert.equal(evaluation.releasable, false);
});

test('an unsatisfied rule is never releasable even with content ready', () => {
  const evaluation = evaluatePublication(
    { title: 'Gazette', contentMarkdown: 'body', contentBlocks: null, releaseRule: pendingRule },
    snapshot(),
  );
  assert.equal(evaluation.planState, 'pending');
  assert.equal(evaluation.contentReadiness, 'ready');
  assert.equal(evaluation.releasable, false);
});

test('a malformed stored rule degrades to needs_plan and never throws', () => {
  const evaluation = evaluatePublication(
    {
      title: 'Gazette',
      contentMarkdown: 'body',
      contentBlocks: null,
      releaseRule: { nope: true },
    },
    snapshot(),
  );
  assert.equal(evaluation.rule, null);
  assert.equal(evaluation.planState, 'needs_plan');
  assert.equal(evaluation.releasable, false);
});
