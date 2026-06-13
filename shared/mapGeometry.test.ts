import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFlowFieldSamples,
  convexHull,
  deriveRibbonPolygon,
  lineStringGeometry,
} from './mapGeometry.js';

describe('deriveRibbonPolygon', () => {
  it('builds a closed corridor from a straight spine', () => {
    const spine = lineStringGeometry([
      [0.2, 0.2],
      [0.8, 0.2],
    ]).coordinates;
    const ring = deriveRibbonPolygon(spine, 0.04);
    assert.ok(ring.length >= 4);
    assert.equal(ring[0][0], ring[ring.length - 1][0]);
    assert.equal(ring[0][1], ring[ring.length - 1][1]);
  });

  it('returns empty for insufficient spine', () => {
    assert.deepEqual(deriveRibbonPolygon([[0, 0]], 0.02), []);
  });
});

describe('convexHull', () => {
  it('wraps scattered points', () => {
    const hull = convexHull([
      [0.1, 0.1],
      [0.9, 0.1],
      [0.5, 0.9],
      [0.2, 0.5],
    ]);
    assert.ok(hull.length >= 3);
  });
});

describe('computeFlowFieldSamples', () => {
  it('samples along spine with forward direction', () => {
    const spine = lineStringGeometry([
      [0, 0],
      [1, 0],
    ]).coordinates;
    const samples = computeFlowFieldSamples(spine, 'forward', 4);
    assert.ok(samples.length >= 3);
    assert.ok(Math.abs(samples[0].direction) < 0.01);
  });
});
