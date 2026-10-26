import assert from 'node:assert/strict';
import { test } from 'node:test';
import { circleGeometry } from './mapCircle.js';
import { parseMapLayerIds, resolveMapLayerIds } from './mapLayerSelection.js';
import { resolveMapObjectPresenceDetailed } from './mapPresence.js';

test('layer query distinguishes defaults, empty and selected; each map supplies its own defaults', () => {
  const layers = [{ id: 'a', defaultEnabled: true }, { id: 'b', defaultEnabled: false }];
  assert.equal(parseMapLayerIds(undefined), undefined);
  assert.deepEqual([...resolveMapLayerIds(parseMapLayerIds(undefined), layers)], ['a']);
  assert.deepEqual([...resolveMapLayerIds(parseMapLayerIds(''), layers)], []);
  assert.deepEqual([...resolveMapLayerIds(parseMapLayerIds(' b, c '), layers)], ['b', 'c']);
  assert.deepEqual([...resolveMapLayerIds([], layers)], []);
  assert.deepEqual([...resolveMapLayerIds(undefined, [{ id: 'new', defaultEnabled: true }])], ['new']);
  assert.deepEqual([...resolveMapLayerIds(undefined, [])], []);
});

test('empty layers hide layered objects even in ghost mode, without altering unlayered rules', () => {
  const ctx = { isElevated: true, editorGhostMode: true, enabledLayerIds: new Set<string>(), viewEpochMinute: 100n, canViewWiki: () => true };
  assert.equal(resolveMapObjectPresenceDetailed({ id: 'layered', layerId: 'a' }, ctx).visible, false);
  assert.equal(resolveMapObjectPresenceDetailed({ id: 'unlayered' }, ctx).visible, true);
  assert.equal(resolveMapObjectPresenceDetailed({ id: 'future', visibleFromEpochMinute: 200n }, { ...ctx, isElevated: false, editorGhostMode: false }).visible, false);
});

test('circle is round in rectangular display space with 64 segments and a closed ring', () => {
  const ring = circleGeometry([700, 250], [800, 250], 1400, 500)!.coordinates[0];
  assert.equal(ring.length, 65);
  assert.deepEqual(ring[0], ring[64]);
  for (const [x, y] of ring) assert.ok(Math.abs(Math.hypot(x * 1400 - 700, y * 500 - 250) - 100) < 1e-8);
});

test('circle radius clamps to nearest boundary without distorting individual vertices', () => {
  const ring = circleGeometry([20, 100], [400, 100], 1400, 500)!.coordinates[0];
  for (const [x, y] of ring) {
    assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1);
    assert.ok(Math.abs(Math.hypot(x * 1400 - 20, y * 500 - 100) - 20) < 1e-8);
  }
  assert.equal(circleGeometry([0, 100], [50, 100], 1400, 500), null);
  assert.equal(circleGeometry([20, 100], [20, 100], 1400, 500), null);
  assert.equal(circleGeometry([-1, 100], [20, 100], 1400, 500), null);
  assert.equal(circleGeometry([20, 100], [NaN, 100], 1400, 500), null);
});
