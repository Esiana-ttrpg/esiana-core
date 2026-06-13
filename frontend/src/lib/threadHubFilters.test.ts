import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';
import {
  defaultThreadHubFilters,
  groupAuthoredByKind,
  partitionThreadHubNodes,
  threadNodeMatchesFilters,
} from './threadHubFilters.ts';
import type { ThreadHubNode } from '@/types/wiki';
import { THREAD_KIND_DISPLAY_ORDER } from './threadMetadata';

function node(
  id: string,
  kind: ThreadHubNode['thread']['threadKind'],
  status: ThreadHubNode['thread']['threadStatus'],
  overrides: Partial<ThreadHubNode['thread']> = {},
): ThreadHubNode {
  return {
    id,
    title: id,
    parentId: null,
    visibility: 'Party',
    createdAt: '',
    updatedAt: '2026-01-02T00:00:00.000Z',
    snippet: '',
    thread: {
      threadMetadataVersion: 'thread-metadata-v1',
      threadKind: kind,
      threadStatus: status,
      narrativeWeight: 'major',
      relatedPageIds: [],
      introducedSessionId: null,
      lastAdvancedSessionId: null,
      resolvedSessionId: null,
      payoffPageId: null,
      playerSubmitted: false,
      sortOrder: null,
      ...overrides,
    },
    references: { related: [], payoff: null },
    children: [],
  };
}

describe('partitionThreadHubNodes', () => {
  it('splits authored setup from player theories', () => {
    const nodes = [
      node('m1', 'mystery', 'OPEN'),
      node('t1', 'theory', 'OPEN', { playerSubmitted: true }),
      node('t2', 'mystery', 'OPEN', { playerSubmitted: true }),
    ];
    const { authored, theories } = partitionThreadHubNodes(nodes);
    assert.equal(authored.length, 1);
    assert.equal(theories.length, 2);
  });
});

describe('threadNodeMatchesFilters', () => {
  it('respects lifecycle filter for DMs', () => {
    const n = node('a', 'promise', 'OPEN');
    n.lifecycleState = NarrativeLifecycleStates.LOCKED;
    const filters = defaultThreadHubFilters();
    filters.lifecycles.LOCKED = false;
    assert.equal(
      threadNodeMatchesFilters(n, filters, { isDM: true }),
      false,
    );
  });
});

describe('groupAuthoredByKind', () => {
  it('orders groups by display config and omits empty kinds', () => {
    const nodes = [
      node('c1', 'clue', 'OPEN'),
      node('m1', 'mystery', 'OPEN'),
    ];
    const groups = groupAuthoredByKind(nodes, THREAD_KIND_DISPLAY_ORDER);
    assert.deepEqual(
      groups.map((g) => g.kind),
      ['mystery', 'clue'],
    );
  });
});
