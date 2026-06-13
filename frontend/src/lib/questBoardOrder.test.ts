import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_ORDER_STEP,
  computeBoardOrderAtIndex,
  compareQuestBoardOrder,
  questBoardSortKey,
} from './questBoardOrder.ts';
import type { QuestHubNode } from '@/types/wiki';

function node(
  id: string,
  opts: { boardOrder?: number | null; createdAt?: string; status?: string } = {},
): QuestHubNode {
  return {
    id,
    title: id,
    parentId: null,
    visibility: 'Party',
    createdAt: opts.createdAt ?? '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    snippet: '',
    quest: {
      questStatus: (opts.status ?? 'AVAILABLE') as QuestHubNode['quest']['questStatus'],
      boardOrder: opts.boardOrder ?? null,
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

describe('questBoardSortKey', () => {
  it('prefers boardOrder when set', () => {
    assert.equal(questBoardSortKey(node('a', { boardOrder: 500 })), 500);
  });

  it('falls back to createdAt', () => {
    const key = questBoardSortKey(
      node('a', { createdAt: '2025-03-15T12:00:00.000Z' }),
    );
    assert.equal(key, Date.parse('2025-03-15T12:00:00.000Z'));
  });
});

describe('computeBoardOrderAtIndex', () => {
  it('inserts midpoint between neighbors', () => {
    const column = [
      node('a', { boardOrder: 1000 }),
      node('b', { boardOrder: 3000 }),
    ];
    assert.equal(computeBoardOrderAtIndex(column, 1), 2000);
  });

  it('subtracts step above top card', () => {
    const column = [node('a', { boardOrder: 5000 })];
    assert.equal(computeBoardOrderAtIndex(column, 0), 5000 - BOARD_ORDER_STEP);
  });

  it('adds step below bottom card', () => {
    const column = [node('a', { boardOrder: 2000 })];
    assert.equal(computeBoardOrderAtIndex(column, 1), 2000 + BOARD_ORDER_STEP);
  });
});

describe('compareQuestBoardOrder', () => {
  it('orders by boardOrder then title', () => {
    const sorted = [
      node('b', { boardOrder: 20 }),
      node('a', { boardOrder: 10 }),
    ].sort(compareQuestBoardOrder);
    assert.deepEqual(sorted.map((n) => n.id), ['a', 'b']);
  });
});
