import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityRelationKinds, type EntityGraphEdge } from './entityGraph.js';
import {
  STORYBOARD_EDGE_PROVENANCE,
  STORYBOARD_MODE_RELATION_KINDS,
  assertStoryboardEdgeProvenance,
  buildModeLegend,
  deriveStoryboardEdges,
} from './storyboardEdgeDerivation.js';

function graphEdge(
  sourceId: string,
  targetId: string,
  relationKind: EntityGraphEdge['relationKind'],
): EntityGraphEdge {
  return {
    id: `${sourceId}-${targetId}-${relationKind}`,
    source: { entityType: 'wiki_page', entityId: sourceId },
    target: { entityType: 'wiki_page', entityId: targetId },
    relationKind,
    direction: 'directed',
    startDate: null,
    endDate: null,
    visibility: null,
    payload: { kind: relationKind },
    sourceDomain: 'wiki_metadata',
    sourceRecordKey: `test:${sourceId}:${targetId}`,
    sourcePageId: sourceId,
  };
}

test('deriveStoryboardEdges returns provenance for arc_flow SCENE_FOLLOWS', () => {
  const edges = deriveStoryboardEdges({
    activeMode: 'arc_flow',
    visibleNodeIds: new Set(['scene-a', 'scene-b']),
    entityGraphEdges: [
      graphEdge('scene-a', 'scene-b', EntityRelationKinds.SCENE_FOLLOWS),
    ],
    entityTitles: new Map([
      ['scene-a', 'Opening'],
      ['scene-b', 'Chase'],
    ]),
  });

  assert.equal(edges.length, 1);
  assert.equal(edges[0]!.relationKind, EntityRelationKinds.SCENE_FOLLOWS);
  assert.equal(edges[0]!.derivationSource, 'followsScenePageIds');
  assert.match(edges[0]!.explanation, /Opening/);
  assert.equal(edges[0]!.editable, true);
  assertStoryboardEdgeProvenance(edges);
});

test('deriveStoryboardEdges filters by active mode', () => {
  const graph = [
    graphEdge('scene-a', 'scene-b', EntityRelationKinds.SCENE_FOLLOWS),
    graphEdge('scene-a', 'thread-1', EntityRelationKinds.SCENE_THREAD),
  ];
  const visible = new Set(['scene-a', 'scene-b', 'thread-1']);
  const titles = new Map([
    ['scene-a', 'A'],
    ['scene-b', 'B'],
    ['thread-1', 'Thread'],
  ]);

  const arc = deriveStoryboardEdges({
    activeMode: 'arc_flow',
    visibleNodeIds: visible,
    entityGraphEdges: graph,
    entityTitles: titles,
  });
  assert.equal(arc.length, 1);
  assert.equal(arc[0]!.relationKind, EntityRelationKinds.SCENE_FOLLOWS);

  const inv = deriveStoryboardEdges({
    activeMode: 'investigation',
    visibleNodeIds: visible,
    entityGraphEdges: graph,
    entityTitles: titles,
  });
  assert.equal(inv.length, 1);
  assert.equal(inv[0]!.relationKind, EntityRelationKinds.SCENE_THREAD);
  assert.equal(inv[0]!.derivationSource, 'linkedThreadPageIds');
});

test('STORYBOARD_EDGE_PROVENANCE covers all kinds used per mode', () => {
  for (const [mode, kinds] of Object.entries(STORYBOARD_MODE_RELATION_KINDS)) {
    for (const kind of kinds) {
      assert.ok(
        STORYBOARD_EDGE_PROVENANCE[kind],
        `missing provenance for ${kind} in mode ${mode}`,
      );
    }
  }
});

test('buildModeLegend describes active mode edge kinds', () => {
  const legend = buildModeLegend('investigation');
  assert.match(legend, /Investigation/);
  assert.match(legend, /linkedThreadPageIds/);
});
