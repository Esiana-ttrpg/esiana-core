import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getHiddenZonesForViewer,
  isVisibilityZoneStyle,
  pickActivePresetAnchor,
} from './mapSceneService.js';
import { buildNarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

test('pickActivePresetAnchor returns largest anchor at or before view epoch', () => {
  const presets = [
    { anchorEpochMinute: 100n },
    { anchorEpochMinute: 500n },
    { anchorEpochMinute: 900n },
  ];
  assert.equal(pickActivePresetAnchor(presets, 600n), 500n);
  assert.equal(pickActivePresetAnchor(presets, 50n), null);
  assert.equal(pickActivePresetAnchor(presets, 900n), 900n);
});

test('isVisibilityZoneStyle detects flag on style object', () => {
  assert.equal(isVisibilityZoneStyle({ isVisibilityZone: true }), true);
  assert.equal(isVisibilityZoneStyle({ fillOpacity: 0.2 }), false);
});

test('getHiddenZonesForViewer masks zone when wiki hidden for party role', () => {
  const partyCtx = buildNarrativeViewerContext({
    role: CampaignMemberRoles.PARTICIPANT,
    campaignNow: { epochMinute: 1000n, dateParts: { year: 1, month: 0, day: 1 } },
  });
  const zones = [
    {
      id: 'z1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      targetPageId: 'page-a',
      pageVisibility: WikiVisibility.PUBLIC,
    },
    {
      id: 'z2',
      geometry: { type: 'Polygon', coordinates: [[[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.2]]] },
      targetPageId: 'page-b',
      pageVisibility: WikiVisibility.DM_ONLY,
    },
  ];
  const presence = new Map([
    ['page-a', ContentRevelationStates.REVEALED],
    ['page-b', ContentRevelationStates.REVEALED],
  ]);
  const visibility = new Map([
    ['page-a', WikiVisibility.PUBLIC],
    ['page-b', WikiVisibility.DM_ONLY],
  ]);
  const hidden = getHiddenZonesForViewer(zones, partyCtx, presence, visibility, true);
  assert.equal(hidden.length, 1);
  assert.deepEqual(hidden[0], zones[1].geometry);
});

test('getHiddenZonesForViewer masks zone when undiscovered', () => {
  const partyCtx = buildNarrativeViewerContext({
    role: CampaignMemberRoles.PARTICIPANT,
    campaignNow: { epochMinute: 1000n, dateParts: { year: 1, month: 0, day: 1 } },
  });
  const zones = [
    {
      id: 'z1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      targetPageId: 'page-a',
      pageVisibility: WikiVisibility.PUBLIC,
    },
    {
      id: 'z2',
      geometry: { type: 'Polygon', coordinates: [[[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.2]]] },
      targetPageId: 'page-b',
      pageVisibility: WikiVisibility.PARTY,
    },
  ];
  const presence = new Map([
    ['page-a', ContentRevelationStates.HIDDEN],
    ['page-b', ContentRevelationStates.REVEALED],
  ]);
  const visibility = new Map([
    ['page-a', WikiVisibility.PUBLIC],
    ['page-b', WikiVisibility.PARTY],
  ]);
  const hidden = getHiddenZonesForViewer(zones, partyCtx, presence, visibility, true);
  assert.equal(hidden.length, 1);
  assert.deepEqual(hidden[0], zones[0].geometry);
});

test('getHiddenZonesForViewer returns empty for elevated without simulatePartyView', () => {
  const gmCtx = buildNarrativeViewerContext({
    role: CampaignMemberRoles.GAMEMASTER,
    campaignNow: { epochMinute: 1000n, dateParts: { year: 1, month: 0, day: 1 } },
  });
  const hidden = getHiddenZonesForViewer(
    [
      {
        id: 'z1',
        geometry: { type: 'Polygon', coordinates: [] },
        targetPageId: 'page-a',
        pageVisibility: WikiVisibility.PUBLIC,
      },
    ],
    gmCtx,
    new Map(),
    new Map(),
    false,
  );
  assert.deepEqual(hidden, []);
});
