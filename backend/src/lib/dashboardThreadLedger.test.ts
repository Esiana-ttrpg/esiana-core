import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortByResolvedAt,
  sortLivingEntries,
  type DashboardOpenThreadEntry,
} from './dashboardThreadLedger.js';

function entry(
  overrides: Partial<DashboardOpenThreadEntry>,
): DashboardOpenThreadEntry {
  return {
    id: 'a',
    title: 'A',
    updatedAt: '2026-01-01T00:00:00.000Z',
    threadKind: 'mystery',
    threadStatus: 'OPEN',
    snippet: '',
    playerSubmitted: false,
    sortOrder: null,
    ...overrides,
  };
}

describe('sortLivingEntries', () => {
  it('sorts OPEN before DORMANT, then sortOrder, then updatedAt desc', () => {
    const entries = [
      entry({ id: 'd', threadStatus: 'DORMANT', sortOrder: 1, updatedAt: '2026-01-03' }),
      entry({ id: 'o2', threadStatus: 'OPEN', sortOrder: 2, updatedAt: '2026-01-01' }),
      entry({ id: 'o1', threadStatus: 'OPEN', sortOrder: 1, updatedAt: '2026-01-02' }),
    ];
    sortLivingEntries(entries);
    assert.deepEqual(entries.map((e) => e.id), ['o1', 'o2', 'd']);
  });
});

describe('sortByResolvedAt', () => {
  it('orders by resolvedAt descending', () => {
    const entries = [
      entry({ id: 'old', resolvedAt: '2026-01-01', updatedAt: '2026-01-01' }),
      entry({ id: 'new', resolvedAt: '2026-01-10', updatedAt: '2026-01-05' }),
    ];
    sortByResolvedAt(entries);
    assert.deepEqual(entries.map((e) => e.id), ['new', 'old']);
  });
});
