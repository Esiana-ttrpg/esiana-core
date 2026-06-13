import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultSemanticRoleForLayer,
  inferMapLayerKind,
  MapLayerKind,
  mergeObjectStyleWithOverlay,
  parseMapObjectOverlayStyle,
  POLITICAL_BORDERS_LAYER_NAME,
} from '../../../shared/mapOverlayTypes.js';
import {
  mergeSceneGeometry,
  pickActiveKeyframe,
} from './mapSceneService.js';

test('inferMapLayerKind — political borders layer name', () => {
  assert.equal(
    inferMapLayerKind({ name: POLITICAL_BORDERS_LAYER_NAME }),
    MapLayerKind.POLITICAL_BORDER,
  );
});

test('defaultSemanticRoleForLayer — political border on region', () => {
  assert.equal(
    defaultSemanticRoleForLayer(MapLayerKind.POLITICAL_BORDER, 'region'),
    'political_border',
  );
});

test('parseMapObjectOverlayStyle — sparse fields', () => {
  const parsed = parseMapObjectOverlayStyle({
    semanticRole: 'claim',
    controllingOrgPageId: 'org-1',
  });
  assert.equal(parsed.semanticRole, 'claim');
  assert.equal(parsed.controllingOrgPageId, 'org-1');
  assert.equal(parsed.layerKind, undefined);
});

test('mergeObjectStyleWithOverlay preserves visual keys', () => {
  const merged = mergeObjectStyleWithOverlay(
    { fillColor: '#fff', fillOpacity: 0.2 },
    { semanticRole: 'political_border', layerKind: MapLayerKind.POLITICAL_BORDER },
  );
  assert.equal(merged.fillColor, '#fff');
  assert.equal(merged.semanticRole, 'political_border');
  assert.equal(merged.layerKind, MapLayerKind.POLITICAL_BORDER);
});

test('pickActiveKeyframe — latest at or before view epoch', () => {
  const frames = [
    { id: 'a', effectiveEpochMinute: 100n, geometryOverride: { a: 1 } },
    { id: 'b', effectiveEpochMinute: 200n, geometryOverride: { b: 2 } },
    { id: 'c', effectiveEpochMinute: 300n, geometryOverride: { c: 3 } },
  ];
  assert.equal(pickActiveKeyframe(frames, 250n)?.id, 'b');
  assert.equal(pickActiveKeyframe(frames, 50n), null);
});

test('mergeSceneGeometry — sparse override does not replace base when absent', () => {
  const base = { type: 'Polygon', coordinates: [[[0, 0]]] };
  const override = { type: 'Polygon', coordinates: [[[1, 1]]] };
  assert.deepEqual(mergeSceneGeometry(base, null), base);
  assert.deepEqual(
    mergeSceneGeometry(base, { geometryOverride: override }),
    override,
  );
  assert.deepEqual(mergeSceneGeometry(base, { geometryOverride: null }), base);
});
