import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityRelationKinds, type EntityGraphEdge } from './entityGraph.js';
import {
  buildStoryboardProjection,
  emptyStoryboardView,
  pruneStaleLayoutNodes,
  sanitizeLayoutForSave,
} from './storyboardProjection.js';

function graphEdge(sourceId: string, targetId: string): EntityGraphEdge {
  return {
    id: `${sourceId}-${targetId}`,
    source: { entityType: 'wiki_page', entityId: sourceId },
    target: { entityType: 'wiki_page', entityId: targetId },
    relationKind: EntityRelationKinds.SCENE_FOLLOWS,
    direction: 'directed',
    startDate: null,
    endDate: null,
    visibility: null,
    payload: { kind: EntityRelationKinds.SCENE_FOLLOWS },
    sourceDomain: 'wiki_metadata',
    sourceRecordKey: 'test',
    sourcePageId: sourceId,
  };
}

test('buildStoryboardProjection derives edges from entity graph not layout', () => {
  const layout = {
    ...emptyStoryboardView(),
    nodes: [
      { entityType: 'scene' as const, entityId: 'a', x: 0, y: 0 },
      { entityType: 'scene' as const, entityId: 'b', x: 200, y: 0 },
    ],
    edges: [{ sourceId: 'a', targetId: 'b', edgeKind: 'branch' as const }],
    activeMode: 'arc_flow' as const,
  };

  const projection = buildStoryboardProjection({
    layout,
    entities: new Map([
      ['a', { title: 'Scene A', sceneStatus: 'PLANNED' }],
      ['b', { title: 'Scene B', sceneStatus: 'PLANNED' }],
    ]),
    entityGraphEdges: [graphEdge('a', 'b')],
  });

  assert.equal(projection.edges.length, 1);
  assert.equal(projection.edges[0]!.relationKind, EntityRelationKinds.SCENE_FOLLOWS);
  assert.equal(projection.edges[0]!.derivationSource, 'followsScenePageIds');
  assert.match(projection.modeLegend, /Arc flow/);
});

test('buildStoryboardProjection marks missing entities', () => {
  const projection = buildStoryboardProjection({
    layout: {
      ...emptyStoryboardView(),
      nodes: [{ entityType: 'scene', entityId: 'ghost', x: 0, y: 0 }],
    },
    entities: new Map(),
  });

  assert.equal(projection.nodes[0]!.missing, true);
  assert.equal(projection.nodes[0]!.title, 'Missing entity');
});

test('pruneStaleLayoutNodes removes unknown entity refs', () => {
  const layout = {
    ...emptyStoryboardView(),
    nodes: [
      { entityType: 'scene' as const, entityId: 'keep', x: 0, y: 0 },
      { entityType: 'scene' as const, entityId: 'drop', x: 10, y: 10 },
    ],
  };
  const pruned = pruneStaleLayoutNodes(layout, new Set(['keep']));
  assert.equal(pruned.nodes.length, 1);
  assert.equal(pruned.nodes[0]!.entityId, 'keep');
});

test('sanitizeLayoutForSave strips semantic edges', () => {
  const layout = {
    ...emptyStoryboardView(),
    edges: [{ sourceId: 'a', targetId: 'b', edgeKind: 'required' as const }],
  };
  const sanitized = sanitizeLayoutForSave(layout);
  assert.deepEqual(sanitized.edges, []);
});
