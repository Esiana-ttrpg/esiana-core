import type { CampaignMemberRole } from '../types/domain.js';
import { canViewWikiPage } from './wikiTree.js';
import { compareWikiTitles } from './wikiSort.js';

export type ThreadHubPageRow = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  metadata: unknown;
  blocks: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function isDescendantOfThreadsRoot(
  pageId: string,
  threadsRootId: string,
  parentById: Map<string, { parentId: string | null }>,
): boolean {
  const visited = new Set<string>();
  let current: string | null | undefined = pageId;

  while (current) {
    if (visited.has(current)) return false;
    visited.add(current);
    const node = parentById.get(current);
    if (!node) return false;
    if (node.parentId === threadsRootId) return true;
    current = node.parentId;
  }
  return false;
}

export function collectVisibleThreadSubtreeRows(
  rows: ThreadHubPageRow[],
  threadsRootId: string,
  role: CampaignMemberRole | null,
): ThreadHubPageRow[] {
  const parentById = new Map(
    rows.map((row) => [row.id, { parentId: row.parentId }]),
  );
  const rowById = new Map(rows.map((row) => [row.id, row]));

  function hasVisibleAncestryChain(pageId: string): boolean {
    const visited = new Set<string>();
    let current: string | null | undefined = pageId;
    while (current && current !== threadsRootId) {
      if (visited.has(current)) return false;
      visited.add(current);
      const node = rowById.get(current);
      if (!node) return false;
      if (!canViewWikiPage(node.visibility, role)) return false;
      current = node.parentId;
    }
    return true;
  }

  return rows.filter((row) => {
    if (row.id === threadsRootId) return false;
    if (!isDescendantOfThreadsRoot(row.id, threadsRootId, parentById)) {
      return false;
    }
    if (!canViewWikiPage(row.visibility, role)) return false;
    if (!row.parentId || row.parentId === threadsRootId) return true;
    return hasVisibleAncestryChain(row.parentId);
  });
}

export type ThreadHubNodePayload = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  thread: import('./threadMetadata.js').ThreadMetadataFields;
  lifecycleState?: import('../../../shared/narrativeLifecycle.js').NarrativeLifecycleState;
  references: {
    related: Array<{ id: string; title: string; href: string }>;
    payoff?: { id: string; title: string; href: string } | null;
  };
  children: ThreadHubNodePayload[];
};

export function buildThreadHubListPayload(
  visibleRows: ThreadHubPageRow[],
  threadsRootId: string,
  mapRow: (row: ThreadHubPageRow) => Omit<ThreadHubNodePayload, 'children'>,
): ThreadHubNodePayload[] {
  const topLevel = visibleRows
    .filter((row) => row.parentId === threadsRootId)
    .sort((a, b) => compareWikiTitles(a.title, b.title, null));

  return topLevel.map((row) => ({
    ...mapRow(row),
    children: [],
  }));
}
