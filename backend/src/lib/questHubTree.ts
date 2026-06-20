import { compareWikiTitles } from './wikiSort.js';
import { type HubVisibilityViewer, isHubPageVisible } from './hubVisibility.js';
import {
  buildWikiPageGraph,
  type WikiPageGraphNode,
} from './wikiDeletion.js';

export type QuestHubPageRow = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  metadata: unknown;
  blocks: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function isDescendantOfQuestsRoot(
  pageId: string,
  questsRootId: string,
  parentById: Map<string, { parentId: string | null }>,
): boolean {
  const visited = new Set<string>();
  let current: string | null | undefined = pageId;

  while (current) {
    if (visited.has(current)) return false;
    visited.add(current);
    const node = parentById.get(current);
    if (!node) return false;
    if (node.parentId === questsRootId) return true;
    current = node.parentId;
  }
  return false;
}

export function collectVisibleQuestSubtreeRows(
  rows: QuestHubPageRow[],
  questsRootId: string,
  viewer: HubVisibilityViewer,
): QuestHubPageRow[] {
  const parentById = new Map(
    rows.map((row) => [row.id, { parentId: row.parentId }]),
  );
  const rowById = new Map(rows.map((row) => [row.id, row]));

  function hasVisibleAncestryChain(pageId: string): boolean {
    const visited = new Set<string>();
    let current: string | null | undefined = pageId;
    while (current && current !== questsRootId) {
      if (visited.has(current)) return false;
      visited.add(current);
      const node = rowById.get(current);
      if (!node) return false;
      if (!isHubPageVisible(node.visibility, viewer)) return false;
      current = node.parentId;
    }
    return true;
  }

  return rows.filter((row) => {
    if (row.id === questsRootId) return false;
    if (!isDescendantOfQuestsRoot(row.id, questsRootId, parentById)) {
      return false;
    }
    if (!isHubPageVisible(row.visibility, viewer)) return false;
    if (!row.parentId || row.parentId === questsRootId) return true;
    return hasVisibleAncestryChain(row.parentId);
  });
}

export type QuestHubTreeNodePayload = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  quest: import('./questMetadata.js').QuestMetadataFields;
  location: string | null;
  progressNote: string | null;
  tags: Array<{
    id: string;
    name: string;
    label: string;
    icon?: string | null;
    color?: string | null;
    iconAssetUrl?: string | null;
  }>;
  progress: import('./questTaskProgress.js').QuestTaskProgress;
  recentActivity: import('./questHubBacklinks.js').QuestHubBacklinkRow[];
  timePressure?: import('../../../shared/questTimeSimulation.js').QuestTimePressureBadge[];
  references: {
    questGiver?: { id: string; title: string; href: string } | null;
    faction?: { id: string; title: string; href: string } | null;
  };
  children: QuestHubTreeNodePayload[];
};

export function buildQuestHubTreePayload(
  visibleRows: QuestHubPageRow[],
  questsRootId: string,
  mapRow: (row: QuestHubPageRow) => Omit<QuestHubTreeNodePayload, 'children'>,
): QuestHubTreeNodePayload[] {
  const payloadById = new Map<string, QuestHubTreeNodePayload>();

  for (const row of visibleRows) {
    payloadById.set(row.id, {
      ...mapRow(row),
      children: [],
    });
  }

  const roots: QuestHubTreeNodePayload[] = [];

  for (const node of payloadById.values()) {
    const parentId = node.parentId;
    if (parentId && parentId !== questsRootId && payloadById.has(parentId)) {
      payloadById.get(parentId)!.children.push(node);
    } else if (parentId === questsRootId) {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: QuestHubTreeNodePayload[], parentTitle: string | null) => {
    nodes.sort((a, b) => compareWikiTitles(a.title, b.title, parentTitle));
    for (const child of nodes) {
      sortNodes(child.children, child.title);
    }
  };
  sortNodes(roots, 'Quests');

  return roots;
}

export function flattenQuestHubPayloadIds(
  nodes: QuestHubTreeNodePayload[],
): string[] {
  const ids: string[] = [];
  const walk = (list: QuestHubTreeNodePayload[]) => {
    for (const node of list) {
      ids.push(node.id);
      walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

export function loadQuestHubGraphNodes(
  pages: Array<{
    id: string;
    title: string;
    parentId: string | null;
    templateType: string;
    metadata: unknown;
  }>,
): Map<string, WikiPageGraphNode> {
  return buildWikiPageGraph(
    pages.map((page) => ({
      id: page.id,
      title: page.title,
      parentId: page.parentId,
      templateType: page.templateType,
      metadata: page.metadata,
    })),
  );
}
