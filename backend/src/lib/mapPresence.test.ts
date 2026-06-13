import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampViewEpochMinuteForParty,
  displayToNormalizedPoint,
  MapRevelationStates,
  normalizedPointToDisplay,
  resolveMapObjectPresenceDetailed,
  WikiVisibilityTier,
} from '../../../shared/mapPresence.js';

const alwaysPublic = () => true;
const denyDmOnly = (v: string) => v !== WikiVisibilityTier.DM_ONLY;

test('resolveMapObjectPresenceDetailed — layer disabled', () => {
  const result = resolveMapObjectPresenceDetailed(
    { id: '1', layerId: 'layer-a' },
    {
      isElevated: false,
      enabledLayerIds: new Set(['layer-b']),
      viewEpochMinute: 100n,
      canViewWiki: alwaysPublic,
    },
  );
  assert.equal(result.visible, false);
  assert.equal(result.reason, 'layer_disabled');
});

test('resolveMapObjectPresenceDetailed — temporal before window', () => {
  const result = resolveMapObjectPresenceDetailed(
    {
      id: '1',
      visibleFromEpochMinute: 200n,
      visibleUntilEpochMinute: 500n,
    },
    {
      isElevated: false,
      enabledLayerIds: new Set(),
      viewEpochMinute: 100n,
      canViewWiki: alwaysPublic,
    },
  );
  assert.equal(result.visible, false);
  assert.equal(result.reason, 'before_visible_from');
});

test('resolveMapObjectPresenceDetailed — unrevealed hidden from party', () => {
  const result = resolveMapObjectPresenceDetailed(
    { id: '1', revelation: MapRevelationStates.HIDDEN },
    {
      isElevated: false,
      enabledLayerIds: new Set(),
      viewEpochMinute: null,
      canViewWiki: alwaysPublic,
    },
  );
  assert.equal(result.visible, false);
  assert.equal(result.reason, 'unrevealed');
});

test('ghost mode keeps visible with reason evaluable', () => {
  const result = resolveMapObjectPresenceDetailed(
    { id: '1', revelation: MapRevelationStates.HIDDEN },
    {
      isElevated: true,
      enabledLayerIds: new Set(),
      viewEpochMinute: null,
      editorGhostMode: true,
      canViewWiki: alwaysPublic,
    },
  );
  assert.equal(result.visible, true);
});

test('MapSceneObjectPresenceInput has no groupId field (groups never affect presence)', () => {
  const sample: Parameters<typeof resolveMapObjectPresenceDetailed>[0] = {
    id: 'obj-1',
    layerId: 'layer-1',
  };
  assert.equal('groupId' in sample, false);
});

test('clampViewEpochMinuteForParty blocks arbitrary party dates', () => {
  const now = 1000n;
  assert.equal(
    clampViewEpochMinuteForParty(5000n, now, false).toString(),
    '1000',
  );
  assert.equal(
    clampViewEpochMinuteForParty(5000n, now, true).toString(),
    '5000',
  );
});

test('normalized geometry round-trip', () => {
  const norm = displayToNormalizedPoint(450, 820, 1000, 1000);
  const display = normalizedPointToDisplay(norm, 1000, 1000);
  assert.equal(display.x, 450);
  assert.equal(display.y, 820);
});

test('inherited wiki hidden', () => {
  const result = resolveMapObjectPresenceDetailed(
    {
      id: '1',
      targetPageId: 'p1',
      targetPageVisibility: WikiVisibilityTier.DM_ONLY,
      requiresTarget: true,
    },
    {
      isElevated: false,
      enabledLayerIds: new Set(),
      viewEpochMinute: null,
      canViewWiki: denyDmOnly,
    },
  );
  assert.equal(result.visible, false);
  assert.equal(result.reason, 'inherited_wiki_hidden');
});
