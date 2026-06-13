import type {
  QuestHubNode,
  QuestHubTagSummary,
  QuestMetadataFields,
  QuestStatus,
  WikiTreeNode,
} from '@/types/wiki';
import { sortQuestHubNodesForBoard } from '@/lib/questBoardOrder';
import { parseSystemCategoryKey, SYSTEM_CATEGORY_QUESTS } from '@/lib/wikiSystemCategory';

export type QuestHubViewMode = 'list' | 'board';

const STORAGE_KEY = 'esiana.questHub.viewMode';

export function readStoredQuestHubViewMode(): QuestHubViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

export function writeStoredQuestHubViewMode(mode: QuestHubViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function walkAncestorPages<T extends { parentId: string | null }>(
  pageId: string,
  pageById: Map<string, T>,
): T[] {
  const ancestors: T[] = [];
  const visited = new Set<string>();
  let current = pageById.get(pageId)?.parentId ?? null;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    ancestors.push(node);
    current = node.parentId;
  }
  return ancestors;
}

export function isPageUnderQuestsCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const pageById = new Map(flatPages.map((page) => [page.id, page]));
  return walkAncestorPages(pageId, pageById).some(
    (node) => parseSystemCategoryKey(node.metadata) === SYSTEM_CATEGORY_QUESTS,
  );
}

export function filterNpcPages(flatPages: WikiTreeNode[]): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (page.templateType === 'CHARACTER') return true;
    return isPageUnderCategoryTitle(page, flatPages, 'Characters');
  });
}

export function filterOrganizationPages(flatPages: WikiTreeNode[]): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (page.templateType === 'ORGANIZATION') return true;
    return isPageUnderCategoryTitle(page, flatPages, 'Organizations');
  });
}

export function filterFamilyPages(flatPages: WikiTreeNode[]): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (page.templateType === 'FAMILY') return true;
    return isPageUnderCategoryTitle(page, flatPages, 'Families');
  });
}

export function filterLocationPages(flatPages: WikiTreeNode[]): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (page.templateType === 'LOCATION') return true;
    return isPageUnderCategoryTitle(page, flatPages, 'Locations');
  });
}

export function isPageUnderBestiaryCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return false;
  return isPageUnderCategoryTitle(page, flatPages, 'Bestiary');
}

export function filterBestiaryPages(
  flatPages: WikiTreeNode[],
  excludePageId?: string,
): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (excludePageId && page.id === excludePageId) return false;
    return isPageUnderBestiaryCategory(page.id, flatPages);
  });
}

export function isPageUnderAncestryCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return false;
  return isPageUnderCategoryTitle(page, flatPages, 'Ancestries');
}

export function filterAncestryPages(
  flatPages: WikiTreeNode[],
  excludePageId?: string,
): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (excludePageId && page.id === excludePageId) return false;
    return isPageUnderAncestryCategory(page.id, flatPages);
  });
}

export function isPageUnderObjectCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return false;
  return isPageUnderCategoryTitle(page, flatPages, 'Objects');
}

export function filterObjectPages(
  flatPages: WikiTreeNode[],
  excludePageId?: string,
): WikiTreeNode[] {
  return flatPages.filter((page) => {
    if (excludePageId && page.id === excludePageId) return false;
    return isPageUnderObjectCategory(page.id, flatPages);
  });
}

export function isPageUnderRuleResourceCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return false;
  return isPageUnderCategoryTitle(page, flatPages, 'Rules/Resources');
}

export function filterRuleResourcePages(flatPages: WikiTreeNode[]): WikiTreeNode[] {
  return flatPages.filter((page) =>
    isPageUnderRuleResourceCategory(page.id, flatPages),
  );
}

export function isPageUnderOrganizationsCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return false;
  if (page.templateType === 'ORGANIZATION') return true;
  return isPageUnderCategoryTitle(page, flatPages, 'Organizations');
}

export function isPageUnderFamiliesCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return false;
  if (page.templateType === 'FAMILY') return true;
  return isPageUnderCategoryTitle(page, flatPages, 'Families');
}

function isPageUnderCategoryTitle(
  page: WikiTreeNode,
  flatPages: WikiTreeNode[],
  categoryTitle: string,
): boolean {
  const pageById = new Map(flatPages.map((p) => [p.id, p]));
  return walkAncestorPages(page.id, pageById).some(
    (node) => node.title === categoryTitle,
  );
}

export const BOARD_COLUMNS: Array<{
  id: string;
  label: string;
  statuses: QuestStatus[];
}> = [
  { id: 'available', label: 'Available', statuses: ['AVAILABLE'] },
  { id: 'active', label: 'Active', statuses: ['ACTIVE'] },
  { id: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
  {
    id: 'failed',
    label: 'Failed / Abandoned',
    statuses: ['FAILED', 'ABANDONED'],
  },
];

export function flattenQuestHubTree(nodes: QuestHubNode[]): QuestHubNode[] {
  const out: QuestHubNode[] = [];
  const walk = (list: QuestHubNode[]) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export function groupQuestNodesByStatus(
  nodes: QuestHubNode[],
): Map<string, QuestHubNode[]> {
  const map = new Map<string, QuestHubNode[]>();
  for (const col of BOARD_COLUMNS) {
    map.set(col.id, []);
  }
  const flat = flattenQuestHubTree(nodes);
  for (const node of flat) {
    const status = node.quest.questStatus;
    const column =
      BOARD_COLUMNS.find((col) => col.statuses.includes(status)) ??
      BOARD_COLUMNS[0];
    map.get(column.id)!.push(node);
  }
  for (const col of BOARD_COLUMNS) {
    const list = map.get(col.id)!;
    map.set(col.id, sortQuestHubNodesForBoard(list));
  }
  return map;
}

/** Target status when a quest card is dropped on a Kanban column. */
export function questStatusForColumnDrop(
  columnId: string,
  previousStatus: QuestStatus,
): QuestStatus {
  switch (columnId) {
    case 'active':
      return 'ACTIVE';
    case 'completed':
      return 'COMPLETED';
    case 'failed':
      return previousStatus === 'ABANDONED' ? 'ABANDONED' : 'FAILED';
    case 'available':
    default:
      return 'AVAILABLE';
  }
}

export function applyQuestPatchInTree(
  nodes: QuestHubNode[],
  questId: string,
  patch: Partial<QuestMetadataFields>,
): QuestHubNode[] {
  return nodes.map((node) => {
    if (node.id === questId) {
      return { ...node, quest: { ...node.quest, ...patch } };
    }
    return {
      ...node,
      children: applyQuestPatchInTree(node.children, questId, patch),
    };
  });
}

/** @deprecated Use applyQuestPatchInTree */
export function applyQuestStatusInTree(
  nodes: QuestHubNode[],
  questId: string,
  questStatus: QuestStatus,
): QuestHubNode[] {
  return applyQuestPatchInTree(nodes, questId, { questStatus });
}

export function applyQuestTagsInTree(
  nodes: QuestHubNode[],
  questId: string,
  tags: QuestHubTagSummary[],
): QuestHubNode[] {
  return nodes.map((node) => {
    if (node.id === questId) {
      return { ...node, tags };
    }
    return {
      ...node,
      children: applyQuestTagsInTree(node.children, questId, tags),
    };
  });
}

export function hubTagsToTagInput(
  tags: QuestHubTagSummary[],
): Array<{ id: string; name: string; label: string }> {
  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    label: tag.label,
  }));
}

export function tagInputToHubTags(
  tags: Array<{ id?: string; name?: string; label?: string }>,
  allCampaignTags: import('@/types/wiki').WikiTag[],
): QuestHubTagSummary[] {
  const results: QuestHubTagSummary[] = [];
  for (const tag of tags) {
    const existing = tag.id
      ? allCampaignTags.find((t) => t.id === tag.id)
      : allCampaignTags.find(
          (t) =>
            (tag.name && t.name === tag.name) ||
            (tag.label && t.label.toLowerCase() === tag.label.toLowerCase()),
        );
    const name = tag.name ?? existing?.name ?? '';
    const label = tag.label ?? existing?.label ?? name;
    if (!tag.id && !name) continue;
    results.push({
      id: tag.id ?? existing?.id ?? '',
      name,
      label,
      icon: existing?.icon ?? null,
      color: existing?.color ?? null,
      iconAssetUrl: existing?.iconAssetUrl ?? null,
    });
  }
  return results;
}

export function findQuestNodeInTree(
  nodes: QuestHubNode[],
  questId: string,
): QuestHubNode | null {
  for (const node of nodes) {
    if (node.id === questId) return node;
    const found = findQuestNodeInTree(node.children, questId);
    if (found) return found;
  }
  return null;
}

export function questStatusBadgeClass(status: QuestStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-primary/15 text-primary border-primary/40';
    case 'COMPLETED':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
    case 'FAILED':
    case 'ABANDONED':
      return 'bg-red-500/15 text-red-400 border-red-500/40';
    case 'AVAILABLE':
    default:
      return 'bg-muted/30 text-muted border-border';
  }
}
