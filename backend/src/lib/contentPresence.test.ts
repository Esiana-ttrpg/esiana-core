import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContentRevelationStates,
  evaluateContentPresence,
  resolveContentPresenceState,
} from '../../../shared/contentPresence.js';

test('resolveContentPresenceState defaults to revealed when missing', () => {
  const state = resolveContentPresenceState([]);
  assert.equal(state, ContentRevelationStates.REVEALED);
});

test('resolveContentPresenceState honors hidden state', () => {
  const state = resolveContentPresenceState([
    {
      campaignId: 'c1',
      entityType: 'wiki_page',
      entityId: 'p1',
      state: ContentRevelationStates.HIDDEN,
    },
  ]);
  assert.equal(state, ContentRevelationStates.HIDDEN);
});

test('evaluateContentPresence blocks hidden and draft', () => {
  assert.equal(
    evaluateContentPresence(ContentRevelationStates.HIDDEN).visible,
    false,
  );
  assert.equal(
    evaluateContentPresence(ContentRevelationStates.DRAFT).visible,
    false,
  );
  assert.equal(
    evaluateContentPresence(ContentRevelationStates.REVEALED).visible,
    true,
  );
});
