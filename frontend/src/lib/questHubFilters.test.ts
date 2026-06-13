import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUEST_HUB_STATUS_FILTERS,
  DEFAULT_QUEST_HUB_TYPE_FILTERS,
  filterQuestHubTree,
  questMatchesStatusFilter,
  questMatchesTypeFilter,
} from './questHubFilters.ts';
import type { QuestHubNode } from '@/types/wiki';

function node(
  id: string,
  status: string,
  type: string | null = null,
  children: QuestHubNode[] = [],
): QuestHubNode {
  return {
    id,
    title: id,
    parentId: null,
    visibility: 'Party',
    createdAt: '',
    updatedAt: '',
    snippet: '',
    quest: {
      questStatus: status as QuestHubNode['quest']['questStatus'],
      boardOrder: null,
      questType: type,
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
    children,
  };
}

describe('questMatchesStatusFilter', () => {
  it('hides completed by default', () => {
    assert.equal(
      questMatchesStatusFilter('COMPLETED', DEFAULT_QUEST_HUB_STATUS_FILTERS),
      false,
    );
  });

  it('shows active by default', () => {
    assert.equal(
      questMatchesStatusFilter('ACTIVE', DEFAULT_QUEST_HUB_STATUS_FILTERS),
      true,
    );
  });
});

describe('questMatchesTypeFilter', () => {
  it('matches preset case-insensitively', () => {
    assert.equal(
      questMatchesTypeFilter('main', DEFAULT_QUEST_HUB_TYPE_FILTERS),
      true,
    );
  });

  it('hides when type unchecked', () => {
    assert.equal(
      questMatchesTypeFilter('Side', { ...DEFAULT_QUEST_HUB_TYPE_FILTERS, Side: false }),
      false,
    );
  });
});

describe('filterQuestHubTree', () => {
  it('filters nested quests independently', () => {
    const tree = [
      node('main', 'ACTIVE', 'Main', [node('side', 'COMPLETED', 'Side')]),
    ];
    const filtered = filterQuestHubTree(
      tree,
      DEFAULT_QUEST_HUB_STATUS_FILTERS,
      DEFAULT_QUEST_HUB_TYPE_FILTERS,
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'main');
    assert.equal(filtered[0].children.length, 0);
  });
});
