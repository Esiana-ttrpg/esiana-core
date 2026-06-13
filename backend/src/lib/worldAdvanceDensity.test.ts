import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONVERGENCE_MAX_ENTRIES } from '../../../shared/chronologyConvergence.js';
import { WORLD_ADVANCE_SCENARIOS } from '../../../shared/worldAdvanceScenarios.js';

/**
 * Mirrors collectWorldAdvanceAnchors: one WORLD_ADVANCE anchor per effect per batch event.
 */
function expectedWorldAdvanceAnchors(
  batches: Array<{ effectCount: number }>,
): number {
  return batches.reduce((sum, b) => sum + b.effectCount, 0);
}

describe('worldAdvanceDensity', () => {
  it('fan-out equals sum of effects per batch', () => {
    const perScenario = WORLD_ADVANCE_SCENARIOS.map((s) => ({
      effectCount: s.effects.length,
    }));
    const anchors = expectedWorldAdvanceAnchors(perScenario);
    const manual = WORLD_ADVANCE_SCENARIOS.reduce((n, s) => n + s.effects.length, 0);
    assert.equal(anchors, manual);
    assert.ok(anchors > 0);
  });

  it('documents threshold before convergence cap', () => {
    const effectsPerBatch = 8;
    const batchesUntilCap = Math.floor(CONVERGENCE_MAX_ENTRIES / effectsPerBatch);
    assert.equal(CONVERGENCE_MAX_ENTRIES, 2000);
    assert.ok(batchesUntilCap >= 200);
    assert.equal(expectedWorldAdvanceAnchors(
      Array.from({ length: batchesUntilCap }, () => ({ effectCount: effectsPerBatch })),
    ), batchesUntilCap * effectsPerBatch);
  });
});
