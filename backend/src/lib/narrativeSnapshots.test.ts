import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacetHashes,
  compressPayloadToCold,
  hashNpcPresence,
  PROJECTION_SEMANTICS_VERSION,
  SNAPSHOT_COLLECTOR_VERSIONS,
  SNAPSHOT_PAYLOAD_VERSION,
  type RegionSnapshotPayloadV1,
} from '../../../shared/narrativeSnapshots.js';

test('facet hashes are stable for same input', () => {
  const facet = [{ pageId: 'a', locationPageId: 'loc-1', title: 'A' }];
  assert.equal(hashNpcPresence(facet), hashNpcPresence([...facet]));
});

test('compressPayloadToCold strips facets but keeps hashes', () => {
  const payload: RegionSnapshotPayloadV1 = {
    meta: {
      snapshotVersion: SNAPSHOT_PAYLOAD_VERSION,
      projectionSemanticsVersion: PROJECTION_SEMANTICS_VERSION,
      projectionContextHash: 'test',
      collectorVersions: { ...SNAPSHOT_COLLECTOR_VERSIONS },
      regionKey: 'north',
      anchorLocationPageId: 'loc-1',
      capturedAtEpochMinute: '100',
    },
    facets: {
      npcPresence: [{ pageId: 'c1', locationPageId: 'loc-1', title: 'NPC' }],
      orgStance: [],
      mapPresence: { visibleObjectIds: [], revelationByObjectId: {} },
      partyKnowledge: [],
      danger: [],
    },
    facetHashes: buildFacetHashes({
      npcPresence: [{ pageId: 'c1', locationPageId: 'loc-1', title: 'NPC' }],
      orgStance: [],
      mapPresence: { visibleObjectIds: [], revelationByObjectId: {} },
      partyKnowledge: [],
      danger: [],
    }),
    summaryLinesAtCapture: ['Line one.'],
  };

  const cold = compressPayloadToCold(payload);
  assert.equal(cold.facets.npcPresence.length, 0);
  assert.equal(cold.facetHashes.entityPresenceHash, payload.facetHashes.entityPresenceHash);
  assert.deepEqual(cold.summaryLinesAtCapture, ['Line one.']);
});
