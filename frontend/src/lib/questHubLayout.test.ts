import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyQuestStatusInTree,
  filterMapPages,
  findLocationsCategoryPage,
  questStatusForColumnDrop,
} from './questHubLayout.ts';
import type { QuestHubNode, WikiTreeNode } from '@/types/wiki';

function sampleNode(id: string, status: string): QuestHubNode {
  return {
    id,
    title: id,
    parentId: null,
    visibility: 'Party',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    snippet: '',
    quest: {
      questStatus: status as QuestHubNode['quest']['questStatus'],
      boardOrder: null,
      questType: null,
      questDate: null,
      questGiverId: null,
      factionId: null,
      rewardsText: null,
      dmRewardsText: null,
    },
    tags: [],
    location: null,
    progressNote: null,
    progress: { completed: 0, total: 0, percent: 0 },
    recentActivity: [],
    references: {},
    children: [],
  };
}

describe('questStatusForColumnDrop', () => {
  it('maps columns to statuses', () => {
    assert.equal(questStatusForColumnDrop('active', 'AVAILABLE'), 'ACTIVE');
    assert.equal(questStatusForColumnDrop('failed', 'AVAILABLE'), 'FAILED');
    assert.equal(questStatusForColumnDrop('failed', 'ABANDONED'), 'ABANDONED');
  });
});

describe('applyQuestStatusInTree', () => {
  it('updates nested quest by id', () => {
    const tree = [
      {
        ...sampleNode('root', 'AVAILABLE'),
        children: [sampleNode('child', 'AVAILABLE')],
      },
    ];
    const next = applyQuestStatusInTree(tree, 'child', 'ACTIVE');
    assert.equal(next[0].children[0].quest.questStatus, 'ACTIVE');
    assert.equal(next[0].quest.questStatus, 'AVAILABLE');
  });
});

describe('findLocationsCategoryPage', () => {
  it('finds Locations folder when nested under World', () => {
    const flatPages: WikiTreeNode[] = [
      {
        id: 'world',
        title: 'World',
        parentId: null,
        templateType: 'DEFAULT',
        metadata: {},
      },
      {
        id: 'locations-root',
        title: 'Locations',
        parentId: 'world',
        templateType: 'DEFAULT',
        metadata: {},
      },
    ];
    assert.equal(findLocationsCategoryPage(flatPages)?.id, 'locations-root');
  });
});

describe('filterMapPages', () => {
  it('includes only pages under the Maps category folder', () => {
    const flatPages: WikiTreeNode[] = [
      {
        id: 'maps-root',
        title: 'Maps',
        parentId: null,
        templateType: 'DEFAULT',
        metadata: {},
      },
      {
        id: 'adventure',
        title: 'Adventure',
        parentId: null,
        templateType: 'DEFAULT',
        metadata: {},
      },
      {
        id: 'city-map',
        title: 'City of Brass',
        parentId: 'maps-root',
        templateType: 'DEFAULT',
        metadata: {},
      },
    ];
    const filtered = filterMapPages(flatPages);
    assert.deepEqual(
      filtered.map((p) => p.id),
      ['city-map'],
    );
  });
});
