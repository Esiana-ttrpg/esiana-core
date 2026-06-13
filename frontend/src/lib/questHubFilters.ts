import type { QuestHubNode, QuestStatus } from '@/types/wiki';
import { QUEST_TYPE_PRESETS } from './questMetadata';
import { BOARD_COLUMNS } from './questHubLayout';

export type QuestHubStatusFilterId =
  | 'available'
  | 'active'
  | 'completed'
  | 'failed';

export type QuestHubTypeFilterId = (typeof QUEST_TYPE_PRESETS)[number];

export type QuestHubStatusFilters = Record<QuestHubStatusFilterId, boolean>;
export type QuestHubTypeFilters = Record<QuestHubTypeFilterId, boolean>;

export const QUEST_HUB_STATUS_FILTER_OPTIONS: Array<{
  id: QuestHubStatusFilterId;
  label: string;
  statuses: QuestStatus[];
}> = BOARD_COLUMNS.map((col) => ({
  id: col.id as QuestHubStatusFilterId,
  label: col.label,
  statuses: col.statuses,
}));

export const DEFAULT_QUEST_HUB_STATUS_FILTERS: QuestHubStatusFilters = {
  available: true,
  active: true,
  completed: false,
  failed: false,
};

export const DEFAULT_QUEST_HUB_TYPE_FILTERS: QuestHubTypeFilters = {
  Main: true,
  Side: true,
  Character: true,
  Faction: true,
  Downtime: true,
};

function normalizeQuestType(type: string | null | undefined): string {
  return (type ?? '').trim().toLowerCase();
}

export function questMatchesStatusFilter(
  status: QuestStatus,
  filters: QuestHubStatusFilters,
): boolean {
  for (const option of QUEST_HUB_STATUS_FILTER_OPTIONS) {
    if (option.statuses.includes(status)) {
      return filters[option.id];
    }
  }
  return filters.available;
}

export function questMatchesTypeFilter(
  questType: string | null | undefined,
  filters: QuestHubTypeFilters,
): boolean {
  const normalized = normalizeQuestType(questType);
  if (!normalized) {
    return QUEST_TYPE_PRESETS.some((preset) => filters[preset]);
  }

  for (const preset of QUEST_TYPE_PRESETS) {
    if (normalizeQuestType(preset) === normalized) {
      return filters[preset];
    }
  }

  return QUEST_TYPE_PRESETS.some((preset) => filters[preset]);
}

export function questNodeMatchesFilters(
  node: QuestHubNode,
  statusFilters: QuestHubStatusFilters,
  typeFilters: QuestHubTypeFilters,
): boolean {
  return (
    questMatchesStatusFilter(node.quest.questStatus, statusFilters) &&
    questMatchesTypeFilter(node.quest.questType, typeFilters)
  );
}

/** Recursively filter tree; keeps nodes that match or have matching descendants. */
export function filterQuestHubTree(
  nodes: QuestHubNode[],
  statusFilters: QuestHubStatusFilters,
  typeFilters: QuestHubTypeFilters,
): QuestHubNode[] {
  const out: QuestHubNode[] = [];

  for (const node of nodes) {
    const filteredChildren = filterQuestHubTree(
      node.children,
      statusFilters,
      typeFilters,
    );
    const selfMatches = questNodeMatchesFilters(node, statusFilters, typeFilters);

    if (selfMatches || filteredChildren.length > 0) {
      out.push({
        ...node,
        children: filteredChildren,
      });
    }
  }

  return out;
}

export function countVisibleQuestNodes(nodes: QuestHubNode[]): number {
  let count = 0;
  const walk = (list: QuestHubNode[]) => {
    for (const node of list) {
      count += 1;
      walk(node.children);
    }
  };
  walk(nodes);
  return count;
}
