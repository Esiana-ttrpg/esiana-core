import type { ThreadHubNode } from '@/types/wiki';
import type { ThreadKind, ThreadStatus } from '@/lib/threadMetadata';
import { isPlayerTheoryThread } from '@/lib/threadMetadata';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '@shared/narrativeLifecycle';

export type ThreadHubKindFilters = Record<ThreadKind, boolean>;
export type ThreadHubStatusFilters = Record<ThreadStatus, boolean>;
export type ThreadHubLifecycleFilters = Record<NarrativeLifecycleState, boolean>;

export interface ThreadHubFilterState {
  kinds: ThreadHubKindFilters;
  statuses: ThreadHubStatusFilters;
  lifecycles: ThreadHubLifecycleFilters;
  playerSubmittedOnly: boolean;
}

export const DEFAULT_THREAD_HUB_KIND_FILTERS: ThreadHubKindFilters = {
  mystery: true,
  promise: true,
  foreshadowing: true,
  clue: true,
  theory: true,
};

export const DEFAULT_THREAD_HUB_STATUS_FILTERS: ThreadHubStatusFilters = {
  OPEN: true,
  DORMANT: true,
  RESOLVED: true,
  ABANDONED: true,
};

export const DEFAULT_THREAD_HUB_LIFECYCLE_FILTERS: ThreadHubLifecycleFilters = {
  LOCKED: true,
  DISCOVERED: true,
  ACTIVE: true,
  COMPLETED: true,
  FAILED: true,
};

export function defaultThreadHubFilters(): ThreadHubFilterState {
  return {
    kinds: { ...DEFAULT_THREAD_HUB_KIND_FILTERS },
    statuses: { ...DEFAULT_THREAD_HUB_STATUS_FILTERS },
    lifecycles: { ...DEFAULT_THREAD_HUB_LIFECYCLE_FILTERS },
    playerSubmittedOnly: false,
  };
}

export function countActiveThreadHubFilters(filters: ThreadHubFilterState): number {
  let count = 0;
  if (filters.playerSubmittedOnly) count += 1;
  for (const value of Object.values(filters.kinds)) {
    if (!value) count += 1;
  }
  for (const value of Object.values(filters.statuses)) {
    if (!value) count += 1;
  }
  for (const value of Object.values(filters.lifecycles)) {
    if (!value) count += 1;
  }
  return count;
}

export function threadNodeMatchesFilters(
  node: ThreadHubNode,
  filters: ThreadHubFilterState,
  options: { isDM: boolean },
): boolean {
  const { thread } = node;
  if (filters.playerSubmittedOnly && !isPlayerTheoryThread(thread.threadKind, thread.playerSubmitted)) {
    return false;
  }
  if (!filters.kinds[thread.threadKind]) return false;
  if (!filters.statuses[thread.threadStatus]) return false;
  if (options.isDM && node.lifecycleState) {
    const life = node.lifecycleState as NarrativeLifecycleState;
    if (
      (Object.values(NarrativeLifecycleStates) as string[]).includes(life) &&
      !filters.lifecycles[life]
    ) {
      return false;
    }
  }
  return true;
}

export function partitionThreadHubNodes(nodes: ThreadHubNode[]): {
  authored: ThreadHubNode[];
  theories: ThreadHubNode[];
} {
  const authored: ThreadHubNode[] = [];
  const theories: ThreadHubNode[] = [];
  for (const node of nodes) {
    if (isPlayerTheoryThread(node.thread.threadKind, node.thread.playerSubmitted)) {
      theories.push(node);
    } else {
      authored.push(node);
    }
  }
  return { authored, theories };
}

export function sortThreadHubNodes(nodes: ThreadHubNode[]): ThreadHubNode[] {
  return [...nodes].sort((a, b) => {
    const sortA = a.thread.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const sortB = b.thread.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function groupAuthoredByKind(
  nodes: ThreadHubNode[],
  displayOrder: readonly ThreadKind[],
): Array<{ kind: ThreadKind; nodes: ThreadHubNode[] }> {
  const groups: Array<{ kind: ThreadKind; nodes: ThreadHubNode[] }> = [];
  for (const kind of displayOrder) {
    const bucket = nodes.filter((node) => node.thread.threadKind === kind);
    if (bucket.length > 0) {
      groups.push({ kind, nodes: sortThreadHubNodes(bucket) });
    }
  }
  return groups;
}
