import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chance, createRng, pickInt } from './rng.js';

describe('sampleData rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('fixture-alpha');
    const b = createRng('fixture-alpha');
    const drawsA = Array.from({ length: 5 }, () => a());
    const drawsB = Array.from({ length: 5 }, () => b());
    assert.deepEqual(drawsA, drawsB);
  });

  it('pickInt stays within bounds', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 50; i += 1) {
      const value = pickInt(rng, 2, 5);
      assert.ok(value >= 2 && value <= 5);
    }
  });

  it('chance respects probability extremes', () => {
    const always = createRng('always');
    const never = createRng('never');
    assert.equal(chance(always, 1), true);
    assert.equal(chance(never, 0), false);
  });
});
