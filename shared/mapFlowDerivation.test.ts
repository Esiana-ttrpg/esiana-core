import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClimateIdempotencyKey,
  buildPathSpine,
  buildRouteIdempotencyKey,
  defaultFlowDirection,
  overlayTemporalPair,
} from './mapFlowDerivation.js';
import { FlowKind } from './mapOverlayTypes.js';

describe('mapFlowDerivation', () => {
  it('defaultFlowDirection — trade is bidirectional', () => {
    assert.equal(defaultFlowDirection(FlowKind.TRADE), 'bidirectional');
    assert.equal(defaultFlowDirection(FlowKind.MIGRATION), 'forward');
  });

  it('buildRouteIdempotencyKey is stable for sorted source ids', () => {
    const a = buildRouteIdempotencyKey({
      derivedFromType: 'displacement',
      sourceIds: ['b', 'a'],
      mapAssetId: 'map-1',
      flowKind: FlowKind.MIGRATION,
    });
    const b = buildRouteIdempotencyKey({
      derivedFromType: 'displacement',
      sourceIds: ['a', 'b'],
      mapAssetId: 'map-1',
      flowKind: FlowKind.MIGRATION,
    });
    assert.equal(a, b);
  });

  it('buildClimateIdempotencyKey uses representsEpoch not generatedAt', () => {
    const key = buildClimateIdempotencyKey({
      calendarId: 'cal-1',
      regionKey: 'frost-march',
      monthKey: '2:Deepwinter',
      representsEpoch: '50000',
      mapAssetId: 'map-1',
    });
    assert.match(key, /50000/);
  });

  it('overlayTemporalPair preserves distinct epochs on scrub', () => {
    const pair = overlayTemporalPair({
      generatedAtEpoch: '90000',
      representsEpoch: '50000',
    });
    assert.ok(pair);
    assert.notEqual(pair!.generatedAtEpoch, pair!.representsEpoch);
  });

  it('buildPathSpine produces at least two points', () => {
    const geom = buildPathSpine([0.1, 0.2], [0.9, 0.8]);
    assert.ok(geom.coordinates.length >= 2);
  });
});
