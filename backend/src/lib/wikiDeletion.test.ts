import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWikiPageGraph,
  collectDescendantIdsFromGraph,
  resolveOrphanParentId,
  buildChildReparentPlan,
  findTaxonomicFolderInGraph,
  isStructuralHierarchyPage,
  type WikiPageGraphNode,
} from './wikiDeletion.js';

function node(
  partial: Omit<WikiPageGraphNode, 'templateType' | 'metadata'> &
    Partial<Pick<WikiPageGraphNode, 'templateType' | 'metadata'>>,
): WikiPageGraphNode {
  return {
    templateType: partial.templateType ?? 'DEFAULT',
    metadata: partial.metadata ?? null,
    ...partial,
  };
}

function buildFixtureGraph(): Map<string, WikiPageGraphNode> {
  const pages: WikiPageGraphNode[] = [
    node({ id: 'world', title: 'World', parentId: null }),
    node({ id: 'characters', title: 'Characters', parentId: 'world' }),
    node({ id: 'objects', title: 'Objects', parentId: 'world' }),
    node({ id: 'locations', title: 'Locations', parentId: 'world' }),
    node({ id: 'game', title: 'Game', parentId: null }),
    node({ id: 'quests', title: 'Quests', parentId: 'game' }),
    node({ id: 'region', title: 'Sword Coast', parentId: 'locations', metadata: { entityCategory: 'locations' } }),
    node({ id: 'town', title: 'Greenest', parentId: 'region', metadata: { entityCategory: 'locations' } }),
    node({ id: 'tavern', title: 'Purple Dragon Inn', parentId: 'town', metadata: { entityCategory: 'locations' } }),
    node({ id: 'room', title: 'Back Room', parentId: 'tavern', metadata: { entityCategory: 'locations' } }),
    node({
      id: 'innkeeper',
      title: 'Innkeeper',
      parentId: 'tavern',
      metadata: { entityCategory: 'characters' },
    }),
    node({
      id: 'top-npc',
      title: 'Regional NPC',
      parentId: 'region',
      metadata: { entityCategory: 'characters' },
    }),
    node({ id: 'quest-line', title: 'Main Arc', parentId: 'quests' }),
    node({ id: 'sub-quest', title: 'Side Mission', parentId: 'quest-line' }),
  ];
  return buildWikiPageGraph(pages);
}

describe('wikiDeletion hierarchy fallback', () => {
  it('Rule 1: location child tiers up when tavern deleted', () => {
    const graph = buildFixtureGraph();
    const tavern = graph.get('tavern')!;
    const room = graph.get('room')!;
    const result = resolveOrphanParentId(tavern, room, graph);
    assert.equal(result.ruleApplied, 'geographical');
    assert.equal(result.parentId, 'town');
  });

  it('Rule 1: deleting tavern moves room to town', () => {
    const graph = buildFixtureGraph();
    const plan = buildChildReparentPlan(graph.get('tavern')!, graph);
    const roomPlan = plan.find((entry) => entry.childId === 'room');
    assert.equal(roomPlan?.proposedParentId, 'town');
    assert.equal(roomPlan?.ruleApplied, 'geographical');
  });

  it('Rule 2: NPC under inn moves to Greenest when inn deleted', () => {
    const graph = buildFixtureGraph();
    const tavern = graph.get('tavern')!;
    const npc = graph.get('innkeeper')!;
    const result = resolveOrphanParentId(tavern, npc, graph);
    assert.equal(result.ruleApplied, 'contained');
    assert.equal(result.parentId, 'town');
  });

  it('Rule 2 safeguard: top-level region NPC snaps to Characters folder', () => {
    const graph = buildFixtureGraph();
    const region = graph.get('region')!;
    const npc = graph.get('top-npc')!;
    const result = resolveOrphanParentId(region, npc, graph);
    assert.equal(result.ruleApplied, 'contained');
    assert.equal(result.parentId, 'characters');
  });

  it('Rule 3: sub-quest tiers up under quest line', () => {
    const graph = buildFixtureGraph();
    const questLine = graph.get('quest-line')!;
    const subQuest = graph.get('sub-quest')!;
    const result = resolveOrphanParentId(questLine, subQuest, graph);
    assert.equal(result.ruleApplied, 'structural');
    assert.equal(result.parentId, 'quests');
  });

  it('detects structural hierarchy under Quests', () => {
    const graph = buildFixtureGraph();
    assert.equal(isStructuralHierarchyPage(graph.get('sub-quest')!, graph), true);
    assert.equal(isStructuralHierarchyPage(graph.get('innkeeper')!, graph), false);
  });

  it('finds taxonomic Characters folder under World', () => {
    const graph = buildFixtureGraph();
    const folder = findTaxonomicFolderInGraph(graph, 'Characters');
    assert.equal(folder?.id, 'characters');
  });

  it('collects all descendants for recursive delete', () => {
    const graph = buildFixtureGraph();
    const descendants = collectDescendantIdsFromGraph(graph, 'tavern');
    assert.deepEqual(new Set(descendants), new Set(['room', 'innkeeper']));
  });
});
