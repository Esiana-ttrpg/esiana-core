import type { QuestHubNode } from '@/types/wiki';
import { readCategoryMetadataField } from '@/lib/wikiMetadata';
import {
  DEFAULT_QUEST_HUB_STATUS_FILTERS,
  DEFAULT_QUEST_HUB_TYPE_FILTERS,
  QUEST_HUB_STATUS_FILTER_OPTIONS,
  type QuestHubStatusFilters,
  type QuestHubTypeFilters,
} from '@/lib/questHubFilters';
import { QUEST_TYPE_PRESETS } from '@/lib/questMetadata';
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function buildQuestHubSearchHaystack(node: QuestHubNode): string {
  const parts: string[] = [node.title];
  if (node.snippet) parts.push(node.snippet);
  if (node.quest.questType) parts.push(node.quest.questType);
  if (node.location) parts.push(node.location);
  if (node.progressNote) parts.push(node.progressNote);
  for (const tag of node.tags ?? []) {
    if (tag.label) parts.push(tag.label);
    else if (tag.name) parts.push(tag.name);
  }
  const giver = node.references?.questGiver?.title;
  if (giver) parts.push(giver);
  const region = readCategoryMetadataField(node as unknown, 'Region');
  if (region) parts.push(region);
  return parts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

export function matchesQuestHubSearch(node: QuestHubNode, query: string): boolean {
  const normalized = normalizeQuery(query);
  if (!normalized) return true;
  return buildQuestHubSearchHaystack(node).includes(normalized);
}

export function questHubSearchRank(node: QuestHubNode, query: string): number {
  const normalized = normalizeQuery(query);
  if (!normalized) return 0;
  const title = node.title.trim().toLowerCase();
  let score = 0;
  if (title.includes(normalized)) score += 100;
  if (title.startsWith(normalized)) score += 50;
  return score;
}

export function compareQuestHubSearchRank(
  a: QuestHubNode,
  b: QuestHubNode,
  query: string,
): number {
  const diff = questHubSearchRank(b, query) - questHubSearchRank(a, query);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function hasActiveQuestHubRefine(
  statusFilters: QuestHubStatusFilters,
  typeFilters: QuestHubTypeFilters,
  showStatusFilters: boolean,
): boolean {
  if (showStatusFilters) {
    for (const option of QUEST_HUB_STATUS_FILTER_OPTIONS) {
      if (
        statusFilters[option.id] !== DEFAULT_QUEST_HUB_STATUS_FILTERS[option.id]
      ) {
        return true;
      }
    }
  }
  for (const preset of QUEST_TYPE_PRESETS) {
    if (typeFilters[preset] !== DEFAULT_QUEST_HUB_TYPE_FILTERS[preset]) {
      return true;
    }
  }
  return false;
}

export function listQuestHubRefineChips(
  statusFilters: QuestHubStatusFilters,
  typeFilters: QuestHubTypeFilters,
  showStatusFilters: boolean,
): Array<{ facetId: string; facetLabel: string; optionValue: string }> {
  const chips: Array<{ facetId: string; facetLabel: string; optionValue: string }> =
    [];
  if (showStatusFilters) {
    for (const option of QUEST_HUB_STATUS_FILTER_OPTIONS) {
      if (statusFilters[option.id]) {
        const allOn = QUEST_HUB_STATUS_FILTER_OPTIONS.every(
          (entry) => statusFilters[entry.id],
        );
        if (!allOn) {
          chips.push({
            facetId: `status-${option.id}`,
            facetLabel: 'Status',
            optionValue: option.label,
          });
        }
      }
    }
  }
  for (const preset of QUEST_TYPE_PRESETS) {
    if (typeFilters[preset]) {
      const allOn = QUEST_TYPE_PRESETS.every((entry) => typeFilters[entry]);
      if (!allOn) {
        chips.push({
          facetId: `type-${preset}`,
          facetLabel: 'Type',
          optionValue: preset,
        });
      }
    }
  }
  return chips;
}

export function countActiveQuestHubRefine(
  statusFilters: QuestHubStatusFilters,
  typeFilters: QuestHubTypeFilters,
  showStatusFilters: boolean,
): number {
  return listQuestHubRefineChips(statusFilters, typeFilters, showStatusFilters)
    .length;
}

export function findSimilarQuestHubEntries(
  nodes: QuestHubNode[],
  query: string,
  limit = 5,
): QuestHubNode[] {  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const scored: Array<{ node: QuestHubNode; score: number }> = [];
  for (const node of nodes) {
    const title = node.title.trim().toLowerCase();
    if (title === normalized) continue;
    let score = 0;
    if (title.startsWith(normalized)) score += 3;
    else if (title.includes(normalized)) score += 2;
    if (score > 0) scored.push({ node, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title),
  );
  return scored.slice(0, limit).map((entry) => entry.node);
}
