import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROGRESSION_SECTION,
  PROGRESSION_SECTIONS,
  isProgressionSectionId,
} from './progressionHub.js';

test('PROGRESSION_SECTIONS is Trajectories | Developments | History', () => {
  const ids = PROGRESSION_SECTIONS.map((section) => section.id);
  assert.deepEqual(ids, ['trajectories', 'developments', 'history']);
  assert.equal(DEFAULT_PROGRESSION_SECTION, 'trajectories');
  assert.equal(isProgressionSectionId('developments'), true);
  assert.equal(isProgressionSectionId('advance'), false);
  assert.equal(isProgressionSectionId('scheduledEffects'), false);
  assert.equal(isProgressionSectionId('consequences'), false);
  assert.equal(isProgressionSectionId('insights'), false);
});
