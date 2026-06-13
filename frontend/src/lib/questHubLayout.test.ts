import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyQuestStatusInTree,
  questStatusForColumnDrop,
} from './questHubLayout.ts';
import type { QuestHubNode } from '@/types/wiki';

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
