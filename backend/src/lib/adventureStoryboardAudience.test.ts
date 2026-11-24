import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyStoryboardView, buildStoryboardProjection } from '../../../shared/storyboardProjection.js';
import { EntityRelationKinds, type EntityGraphEdge } from '../../../shared/entityGraph.js';
import { buildArcHierarchyProjection } from '../../../shared/arcHierarchyProjection.js';
import { restrictArcInputs, restrictStoryboardEdges, restrictStoryboardLayout } from './adventureStoryboardAudience.js';

function edge(source: string, target: string, sourcePageId = source): EntityGraphEdge {
  return { id: `${source}-${target}`, source: { entityType: 'wiki_page', entityId: source },
    target: { entityType: 'wiki_page', entityId: target }, relationKind: EntityRelationKinds.SCENE_FOLLOWS,
    direction: 'directed', startDate: null, endDate: null, visibility: 'PARTY',
    payload: { kind: EntityRelationKinds.SCENE_FOLLOWS }, sourceDomain: 'wiki_metadata', sourceRecordKey: 'test', sourcePageId, visible: true };
}

test('storyboard projection removes hidden nodes, edge provenance and authored layout metadata', () => {
  const layout = { ...emptyStoryboardView(), activeMode: 'arc_flow' as const,
    nodes: [{ entityType: 'scene' as const, entityId: 'a', x: 0, y: 0, laneId: 'secret-lane' },
      { entityType: 'scene' as const, entityId: 'b', x: 1, y: 0 },
      { entityType: 'scene' as const, entityId: 'secret-id', x: 2, y: 0 }],
    edges: [{ sourceId: 'a', targetId: 'secret-id', edgeKind: 'required' as const, label: 'secret-label' }],
    lanes: [{ id: 'secret-lane', label: 'secret-lane-label' }],
    annotations: [{ id: 'secret-note', x: 0, y: 0, text: 'secret-text' }],
    visibility: { collapseByArc: ['secret-id'] },
  };
  const ids = new Set(['a', 'b']);
  const safeLayout = restrictStoryboardLayout(layout, ids);
  const safeEdges = restrictStoryboardEdges([edge('a', 'b'), edge('a', 'secret-id'), edge('a', 'b', 'secret-id'),
    { ...edge('a', 'b'), visibility: 'DM_ONLY', visible: false }, { ...edge('a', 'b'), visible: undefined }], ids);
  const projection = buildStoryboardProjection({ layout: safeLayout, entities: new Map([['a', { title: 'Mira' }], ['b', { title: 'Sable' }]]), entityGraphEdges: safeEdges });
  const serialized = JSON.stringify(projection);
  assert.equal(projection.nodes.length, 2);
  assert.equal(projection.edges.length, 1);
  assert.doesNotMatch(serialized, /secret/);
  assert.equal(layout.nodes.length, 3);
  assert.equal(restrictStoryboardEdges([{ ...edge('a', 'b'), visibility: ' campaign ' }], ids, () => true).length, 1);
  assert.equal(restrictStoryboardEdges([{ ...edge('a', 'b'), visibility: 'CAMPAIGN' }], ids, () => false).length, 0);
});

test('arc projection computes associations only from visible quest inputs', () => {
  const quests = [
    { id: 'arc', title: 'Arc', parentId: 'root', metadata: { arcKind: 'campaign_arc', containedPageIds: ['visible'] } },
    { id: 'visible', title: 'Visible quest', parentId: 'root', metadata: { questStatus: 'ACTIVE' } },
  ];
  const scenes = [{ id: 'scene', title: 'Scene', parentId: 'root', metadata: { sceneStatus: 'READY', linkedObjectivePageIds: ['secret-objective'], linkedQuestPageIds: ['visible', 'secret-quest'] } }];
  const safe = restrictArcInputs('root', quests, scenes);
  const projection = buildArcHierarchyProjection({ questsRootId: 'root', questRows: safe.quests, sceneRows: safe.scenes });
  assert.doesNotMatch(JSON.stringify(projection), /secret/);
  assert.equal(projection.sceneObjectiveCounts.scene, 0);
  const quest = projection.roots[0]?.children.find(node => node.id === 'visible');
  assert.equal(quest?.children.find(node => node.kind === 'scene_ref')?.id, 'scene');
});
