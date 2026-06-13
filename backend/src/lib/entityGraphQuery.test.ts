import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  EntityRelationSourceDomains,
  type EntityGraphEdge,
  type EntityGraphNodeRef,
} from '../../../shared/entityGraph.js';
import {
  buildAdjacencyIndex,
  findCycles,
  findOrphans,
  neighbors,
  shortestPath,
  traverseBfs,
} from '../../../shared/entityGraphQuery.js';

function edge(
  id: string,
  source: EntityGraphNodeRef,
  target: EntityGraphNodeRef,
  kind = EntityRelationKinds.CALENDAR_PREREQUISITE,
): EntityGraphEdge {
  return {
    id,
    source,
    target,
    relationKind: kind,
    direction: 'directed',
    startDate: null,
    endDate: null,
    visibility: 'PUBLIC',
    payload: { kind: EntityRelationKinds.CALENDAR_PREREQUISITE },
    sourceDomain: EntityRelationSourceDomains.CALENDAR,
    sourceRecordKey: `calendar:${id}`,
    sourcePageId: null,
  };
}

const wiki = (id: string): EntityGraphNodeRef => ({
  entityType: EntityGraphEntityTypes.WIKI_PAGE,
  entityId: id,
});

const event = (id: string): EntityGraphNodeRef => ({
  entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
  entityId: id,
});

test('buildAdjacencyIndex supports inbound and outbound lookup', () => {
  const edges = [
    edge('1', event('a'), event('b')),
    edge('2', event('b'), event('c')),
  ];
  const index = buildAdjacencyIndex(edges);
  assert.equal(neighbors(index, event('b'), { direction: 'outbound' }).length, 1);
  assert.equal(neighbors(index, event('b'), { direction: 'inbound' }).length, 1);
});

test('traverseBfs respects maxDepth', () => {
  const edges = [
    edge('1', wiki('a'), wiki('b')),
    edge('2', wiki('b'), wiki('c')),
    edge('3', wiki('c'), wiki('d')),
  ];
  const index = buildAdjacencyIndex(edges);
  const depth1 = traverseBfs(index, wiki('a'), 1);
  assert.equal(depth1.visited.size, 2);
  const depth2 = traverseBfs(index, wiki('a'), 2);
  assert.equal(depth2.visited.size, 3);
});

test('findCycles detects calendar prerequisite loop', () => {
  const edges = [
    edge('1', event('a'), event('b')),
    edge('2', event('b'), event('c')),
    edge('3', event('c'), event('a')),
  ];
  const cycles = findCycles(edges, [EntityRelationKinds.CALENDAR_PREREQUISITE]);
  assert.ok(cycles.length >= 1);
});

test('findOrphans flags wiki page with no narrative edges', () => {
  const edges = [edge('1', wiki('a'), wiki('b'), EntityRelationKinds.WIKI_REFERENCE)];
  const orphans = findOrphans([wiki('c')], edges);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0]?.node.entityId, 'c');
});

test('shortestPath finds multi-hop route', () => {
  const edges = [
    edge('1', wiki('a'), wiki('b'), EntityRelationKinds.WIKI_REFERENCE),
    edge('2', wiki('b'), wiki('c'), EntityRelationKinds.WIKI_REFERENCE),
  ];
  const index = buildAdjacencyIndex(edges);
  const path = shortestPath(index, wiki('a'), wiki('c'));
  assert.equal(path.found, true);
  assert.equal(path.edges.length, 2);
});
