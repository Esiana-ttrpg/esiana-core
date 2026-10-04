import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROGRESSION_SECTION,
  PROGRESSION_SECTIONS,
  isProgressionSectionId,
} from './progressionHub.js';

test('PROGRESSION_SECTIONS is Trajectories-first without Insights/Scenes', () => {
  const ids = PROGRESSION_SECTIONS.map((section) => section.id);
  assert.deepEqual(ids, [
    'trajectories',
    'advance',
    'developments',
    'scheduledEffects',
    'consequences',
    'history',
  ]);
  assert.equal(DEFAULT_PROGRESSION_SECTION, 'trajectories');
  assert.equal(isProgressionSectionId('trajectories'), true);
  assert.equal(isProgressionSectionId('insights'), false);
  assert.equal(isProgressionSectionId('scenes'), false);
});
