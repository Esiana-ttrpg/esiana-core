import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdventureSessionAvailable } from './adventureSessionAudience.js';

test('Party session anchors exclude hidden, draft and future presence', () => {
  assert.equal(isAdventureSessionAvailable(undefined, 100n), true);
  assert.equal(isAdventureSessionAvailable({ state: 'REVEALED', availableFromEpochMinute: 100n }, 100n), true);
  assert.equal(isAdventureSessionAvailable({ state: 'REVEALED', availableFromEpochMinute: 101n }, 100n), false);
  assert.equal(isAdventureSessionAvailable({ state: 'HIDDEN', availableFromEpochMinute: null }, 100n), false);
  assert.equal(isAdventureSessionAvailable({ state: 'DRAFT', availableFromEpochMinute: null }, 100n), false);
});
