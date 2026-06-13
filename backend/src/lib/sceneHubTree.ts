import type { CampaignMemberRole } from '../types/domain.js';
import { canViewWikiPage } from './wikiTree.js';
import { compareWikiTitles } from './wikiSort.js';

export type SceneHubPageRow = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  metadata: unknown;
  blocks: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function isDescendantOfScenesRoot(
  pageId: string,
  scenesRootId: string,
  parentById: Map<string, { parentId: string | null }>,
): boolean {
  const visited = new Set<string>();
  let current: string | null | undefined = pageId;

  while (current) {
    if (visited.has(current)) return false;
    visited.add(current);
    const node = parentById.get(current);
    if (!node) return false;
    if (node.parentId === scenesRootId) return true;
    current = node.parentId;
  }
  return false;
}

export function collectVisibleSceneSubtreeRows(
  rows: SceneHubPageRow[],
  scenesRootId: string,
  role: CampaignMemberRole | null,
): SceneHubPageRow[] {
  const parentById = new Map(
    rows.map((row) => [row.id, { parentId: row.parentId }]),
  );
  const rowById = new Map(rows.map((row) => [row.id, row]));

  function hasVisibleAncestryChain(pageId: string): boolean {
    const visited = new Set<string>();
    let current: string | null | undefined = pageId;
    while (current && current !== scenesRootId) {
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
    if (row.id === scenesRootId) return false;
    if (!isDescendantOfScenesRoot(row.id, scenesRootId, parentById)) {
      return false;
    }
    if (!canViewWikiPage(row.visibility, role)) return false;
    if (!row.parentId || row.parentId === scenesRootId) return true;
    return hasVisibleAncestryChain(row.parentId);
  });
}

export type SceneHubNodePayload = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  scene: import('./sceneMetadata.js').SceneMetadataFields;
  lifecycleState?: import('../../../shared/narrativeLifecycle.js').NarrativeLifecycleState;
  references: {
    participants: Array<{ id: string; title: string; href: string }>;
    location?: { id: string; title: string; href: string } | null;
    quests: Array<{ id: string; title: string; href: string }>;
    clues: Array<{ id: string; title: string; href: string }>;
    threads: Array<{ id: string; title: string; href: string }>;
    followsScenes: Array<{ id: string; title: string; href: string }>;
  };
  children: SceneHubNodePayload[];
};

export function buildSceneHubListPayload(
  visibleRows: SceneHubPageRow[],
  scenesRootId: string,
  mapRow: (row: SceneHubPageRow) => Omit<SceneHubNodePayload, 'children'>,
): SceneHubNodePayload[] {
  const topLevel = visibleRows
    .filter((row) => row.parentId === scenesRootId)
    .sort((a, b) => compareWikiTitles(a.title, b.title, null));

  return topLevel.map((row) => ({
    ...mapRow(row),
    children: [],
  }));
}
