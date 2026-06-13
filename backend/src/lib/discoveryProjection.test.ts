import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContentRevelationStates,
} from '../../../shared/contentPresence.js';
import {
  KnowledgeStates,
  LoreConfidences,
  type LoreClaimRecord,
} from '../../../shared/loreKnowledge.js';
import {
  DiscoveryStates,
  computeIsContested,
  computePartyKnowledgeGroups,
  filterClaimsForPartyKnowledge,
  inferRevelationSource,
  isEntityDiscovered,
  partitionByDiscovery,
  projectDiscoveryState,
  serializeClaimRevelation,
} from '../../../shared/discoveryProjection.js';

test('isEntityDiscovered hides unrevealed pages from party', () => {
  assert.equal(
    isEntityDiscovered(ContentRevelationStates.HIDDEN, false),
    false,
  );
  assert.equal(
    isEntityDiscovered(ContentRevelationStates.HIDDEN, true),
    true,
  );
});

test('partitionByDiscovery counts undiscovered for party', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const map = new Map([
    ['a', ContentRevelationStates.REVEALED],
    ['b', ContentRevelationStates.HIDDEN],
    ['c', ContentRevelationStates.REVEALED],
  ]);
  const result = partitionByDiscovery(items, map, false);
  assert.equal(result.discovered.length, 2);
  assert.equal(result.undiscoveredCount, 1);
});

test('filterClaimsForPartyKnowledge omits undiscovered', () => {
  const claims = [
    { knowledgeState: KnowledgeStates.KNOWN },
    { knowledgeState: KnowledgeStates.UNDISCOVERED },
  ] as LoreClaimRecord[];
  const filtered = filterClaimsForPartyKnowledge(claims, false);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.knowledgeState, KnowledgeStates.KNOWN);
});

test('computeIsContested detects conflicting claim states', () => {
  const claims = [
    { knowledgeState: KnowledgeStates.CONFIRMED },
    { knowledgeState: KnowledgeStates.DISPROVEN },
  ] as LoreClaimRecord[];
  assert.equal(computeIsContested(claims), true);
});

test('computePartyKnowledgeGroups places contested claims in contested bucket', () => {
  const claims = [
    {
      id: '1',
      knowledgeState: KnowledgeStates.CONFIRMED,
    },
    {
      id: '2',
      knowledgeState: KnowledgeStates.DISPROVEN,
    },
  ] as LoreClaimRecord[];
  const groups = computePartyKnowledgeGroups(claims);
  assert.equal(groups.contested.length, 2);
  assert.equal(groups.confirmed.length, 0);
});

test('inferRevelationSource maps session id', () => {
  const source = inferRevelationSource({
    discoveredViaSessionId: 'sess-1',
  });
  assert.deepEqual(source, { type: 'SESSION', sessionId: 'sess-1' });
});

test('serializeClaimRevelation returns provenance', () => {
  const result = serializeClaimRevelation({
    discoveredAt: new Date('2026-01-01T00:00:00.000Z'),
    discoveredViaType: 'MANUAL',
  });
  assert.ok(result?.discoveredAt);
  assert.deepEqual(result?.source, { type: 'MANUAL' });
});

test('projectDiscoveryState blocks party before availableFromEpochMinute', () => {
  const result = projectDiscoveryState({
    presenceState: ContentRevelationStates.REVEALED,
    availableFromEpochMinute: 5000,
    campaignNowEpochMinute: 4000,
    claims: [],
    isManagerView: false,
  });
  assert.equal(result.available, false);
  assert.equal(result.state, DiscoveryStates.HIDDEN);
  assert.equal(result.gatedUntil, 5000);
});

test('projectDiscoveryState omits gatedUntil for manual hidden presence', () => {
  const result = projectDiscoveryState({
    presenceState: ContentRevelationStates.HIDDEN,
    availableFromEpochMinute: 5000,
    campaignNowEpochMinute: 4000,
    claims: [],
    isManagerView: false,
  });
  assert.equal(result.available, false);
  assert.equal(result.state, DiscoveryStates.HIDDEN);
  assert.equal(result.gatedUntil, undefined);
});

test('projectDiscoveryState manager bypasses availability gate', () => {
  const result = projectDiscoveryState({
    presenceState: ContentRevelationStates.HIDDEN,
    availableFromEpochMinute: 5000,
    campaignNowEpochMinute: 4000,
    claims: [{ knowledgeState: KnowledgeStates.SUSPECTED, confidence: LoreConfidences.UNVERIFIED } as LoreClaimRecord],
    isManagerView: true,
  });
  assert.equal(result.available, true);
  assert.equal(result.state, DiscoveryStates.RUMOR);
});

test('projectDiscoveryState resolves contested before rumor', () => {
  const claims = [
    { knowledgeState: KnowledgeStates.CONFIRMED, confidence: LoreConfidences.VERIFIED },
    { knowledgeState: KnowledgeStates.DISPROVEN, confidence: LoreConfidences.VERIFIED },
  ] as LoreClaimRecord[];
  const result = projectDiscoveryState({
    presenceState: ContentRevelationStates.REVEALED,
    claims,
    isManagerView: false,
  });
  assert.equal(result.available, true);
  assert.equal(result.state, DiscoveryStates.CONTESTED);
});

test('projectDiscoveryState resolves rumor when only suspected claims', () => {
  const claims = [
    { knowledgeState: KnowledgeStates.SUSPECTED, confidence: LoreConfidences.UNVERIFIED },
  ] as LoreClaimRecord[];
  const result = projectDiscoveryState({
    presenceState: ContentRevelationStates.REVEALED,
    claims,
    isManagerView: false,
  });
  assert.equal(result.state, DiscoveryStates.RUMOR);
});

test('projectDiscoveryState defaults to known when settled', () => {
  const result = projectDiscoveryState({
    presenceState: ContentRevelationStates.REVEALED,
    claims: [{ knowledgeState: KnowledgeStates.CONFIRMED, confidence: LoreConfidences.VERIFIED } as LoreClaimRecord],
    isManagerView: false,
  });
  assert.equal(result.state, DiscoveryStates.KNOWN);
});
