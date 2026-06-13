import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityRelationKinds, type EntityGraphEdge } from './entityGraph.js';
import {
  computeConnectivityScore,
  isNarrativelyConnected,
} from './narrativeConnectivity.js';

function edge(
  sourceId: string,
  targetId: string,
  kind: EntityGraphEdge['relationKind'],
): EntityGraphEdge {
  return {
    id: `${sourceId}-${targetId}`,
    source: { entityType: 'wiki_page', entityId: sourceId },
    target: { entityType: 'wiki_page', entityId: targetId },
    relationKind: kind,
    direction: 'directed',
    startDate: null,
    endDate: null,
    visibility: null,
    payload: null,
    sourceDomain: 'wiki_metadata',
    sourceRecordKey: 'test',
    sourcePageId: sourceId,
  };
}

test('deep faction chain reaches active quest via weighted connectivity', () => {
  const edges = [
    edge('npc', 'faction', EntityRelationKinds.CHARACTER_AFFILIATION),
    edge('faction', 'region', EntityRelationKinds.ORG_HQ),
    edge('region', 'event', EntityRelationKinds.LOCATION_REGION),
    edge('event', 'quest', EntityRelationKinds.QUEST_GIVER),
  ];
  const score = computeConnectivityScore({
    startPageId: 'npc',
    edges,
    activeTargetPageIds: new Set(['quest']),
  });
  assert.equal(isNarrativelyConnected(score), true);
});

test('incidental weak link alone does not satisfy connectivity', () => {
  const edges = [edge('npc', 'misc', EntityRelationKinds.WIKI_REFERENCE)];
  const score = computeConnectivityScore({
    startPageId: 'npc',
    edges,
    activeTargetPageIds: new Set(['quest']),
  });
  assert.equal(isNarrativelyConnected(score), false);
});
