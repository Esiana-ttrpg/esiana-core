import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildArcHierarchyProjection } from './arcHierarchyProjection.js';

const questsRootId = 'quests-root';

function questRow(id: string, title: string, parentId: string | null = questsRootId) {
  return {
    id,
    title,
    parentId,
    metadata: { questStatus: 'ACTIVE' },
  };
}

describe('buildArcHierarchyProjection', () => {
  it('builds campaign arc → questline → quest → objective → scene_ref', () => {
    const projection = buildArcHierarchyProjection({
      questsRootId,
      questRows: [
        {
          id: 'arc-1',
          title: 'Main Arc',
          parentId: questsRootId,
          metadata: {
            arcKind: 'campaign_arc',
            containedPageIds: ['ql-1'],
          },
        },
        {
          id: 'ql-1',
          title: 'Act I',
          parentId: questsRootId,
          metadata: {
            arcKind: 'questline',
            containedPageIds: ['quest-1'],
          },
        },
        questRow('quest-1', 'Rescue Mission'),
        {
          id: 'obj-1',
          title: 'Find the key',
          parentId: 'quest-1',
          metadata: { objectiveStatus: 'ACTIVE' },
        },
      ],
      sceneRows: [
        {
          id: 'scene-1',
          title: 'Negotiation',
          parentId: 'scenes-root',
          metadata: {
            sceneStatus: 'PLANNED',
            linkedObjectivePageIds: ['obj-1'],
            linkedQuestPageIds: ['quest-1'],
          },
        },
      ],
    });

    assert.equal(projection.roots.length, 1);
    assert.equal(projection.roots[0]?.kind, 'campaign_arc');
    assert.equal(projection.roots[0]?.children[0]?.kind, 'questline');
    assert.equal(projection.roots[0]?.children[0]?.children[0]?.kind, 'quest');
    const objective =
      projection.roots[0]?.children[0]?.children[0]?.children[0];
    assert.equal(objective?.kind, 'objective');
    assert.equal(objective?.children[0]?.kind, 'scene_ref');
    assert.equal(objective?.children[0]?.id, 'scene-1');
    assert.equal(projection.scenesById['scene-1']?.title, 'Negotiation');
    assert.equal(projection.scenesById['scene-1']?.associatedObjectiveCount, 1);
  });

  it('indexes scene under multiple objectives without duplicating payload', () => {
    const projection = buildArcHierarchyProjection({
      questsRootId,
      questRows: [
        questRow('quest-1', 'Heist'),
        { id: 'obj-a', title: 'A', parentId: 'quest-1', metadata: { objectiveStatus: 'ACTIVE' } },
        { id: 'obj-b', title: 'B', parentId: 'quest-1', metadata: { objectiveStatus: 'ACTIVE' } },
      ],
      sceneRows: [
        {
          id: 'scene-x',
          title: 'Vault Talk',
          parentId: 'scenes-root',
          metadata: {
            sceneStatus: 'READY',
            linkedObjectivePageIds: ['obj-a', 'obj-b'],
          },
        },
      ],
    });

    assert.equal(projection.sceneObjectiveCounts['scene-x'], 2);
    assert.equal(Object.keys(projection.scenesById).length, 1);
  });
});
