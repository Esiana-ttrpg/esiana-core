/**
 * Layer 4 — weighted narrative connectivity traversal.
 */
import {
  EntityRelationKinds,
  type EntityGraphEdge,
  type EntityRelationKind,
  nodeRefKey,
} from './entityGraph.js';
import { buildAdjacencyIndex, neighbors } from './entityGraphQuery.js';
import { parseNodeRefKey } from './entityGraph.js';

export type NarrativeConnectivityWeight = 'strong' | 'weak' | 'structural';

export const EDGE_CONNECTIVITY_WEIGHT: Partial<
  Record<EntityRelationKind, NarrativeConnectivityWeight>
> = {
  [EntityRelationKinds.QUEST_GIVER]: 'strong',
  [EntityRelationKinds.QUEST_FACTION]: 'strong',
  [EntityRelationKinds.THREAD_RELATED]: 'strong',
  [EntityRelationKinds.THREAD_PAYOFF]: 'strong',
  [EntityRelationKinds.CALENDAR_PREREQUISITE]: 'strong',
  [EntityRelationKinds.CHARACTER_AFFILIATION]: 'weak',
  [EntityRelationKinds.ORG_LEADER]: 'weak',
  [EntityRelationKinds.ORG_DIPLOMATIC]: 'weak',
  [EntityRelationKinds.WIKI_REFERENCE]: 'weak',
  [EntityRelationKinds.LOCATION_REGION]: 'structural',
  [EntityRelationKinds.LOCATION_RELATED]: 'structural',
  [EntityRelationKinds.LOCATION_MAP]: 'structural',
  [EntityRelationKinds.PAGE_PARENT]: 'structural',
  [EntityRelationKinds.MAP_TARGETS]: 'weak',
  [EntityRelationKinds.ORG_PARENT]: 'weak',
  [EntityRelationKinds.ORG_HQ]: 'weak',
  [EntityRelationKinds.CHARACTER_LINEAGE]: 'weak',
  [EntityRelationKinds.CHARACTER_SOCIAL]: 'strong',
};

const WEIGHT_SCORE: Record<NarrativeConnectivityWeight, number> = {
  strong: 3,
  weak: 1,
  structural: 0.5,
};

export const CONNECTIVITY_MAX_DEPTH = 6;

export type ConnectivityScoreResult = {
  strongScore: number;
  weakScore: number;
  reachedActiveTarget: boolean;
};

export type ConnectivityTraversalInput = {
  startPageId: string;
  edges: readonly EntityGraphEdge[];
  activeTargetPageIds: ReadonlySet<string>;
  calendarEventIds?: ReadonlySet<string>;
  maxDepth?: number;
};

function edgeWeightScore(kind: EntityRelationKind): {
  weight: NarrativeConnectivityWeight;
  score: number;
} | null {
  if (kind === EntityRelationKinds.PAGE_PARENT) return null;
  const weight = EDGE_CONNECTIVITY_WEIGHT[kind] ?? 'weak';
  return { weight, score: WEIGHT_SCORE[weight] };
}

function isActiveTargetNode(
  nodeKey: string,
  activeTargetPageIds: ReadonlySet<string>,
  calendarEventIds?: ReadonlySet<string>,
): boolean {
  const parsed = nodeKey.split(':');
  if (parsed.length < 2) return false;
  const entityType = parsed[0];
  const entityId = parsed.slice(1).join(':');
  if (entityType === 'wiki_page') {
    return activeTargetPageIds.has(entityId);
  }
  if (entityType === 'calendar_event' && calendarEventIds) {
    return calendarEventIds.has(entityId);
  }
  return false;
}

export function computeConnectivityScore(
  input: ConnectivityTraversalInput,
): ConnectivityScoreResult {
  const index = buildAdjacencyIndex(input.edges);
  const startKey = `wiki_page:${input.startPageId}`;
  const maxDepth = input.maxDepth ?? CONNECTIVITY_MAX_DEPTH;

  let strongScore = 0;
  let weakScore = 0;
  let reachedActiveTarget = activeTargetPageIdsHas(input.activeTargetPageIds, input.startPageId);

  const visited = new Set<string>([startKey]);
  const queue: Array<{ key: string; depth: number }> = [{ key: startKey, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const nodeRef = parseNodeRefKey(current.key);
    if (!nodeRef) continue;
    for (const edge of neighbors(index, nodeRef, { direction: 'both' })) {
      const other =
        nodeRefKey(edge.source) === current.key
          ? nodeRefKey(edge.target)
          : nodeRefKey(edge.source);
      if (visited.has(other)) continue;

      const weightInfo = edgeWeightScore(edge.relationKind);
      if (!weightInfo) continue;

      visited.add(other);

      if (weightInfo.weight === 'strong') {
        strongScore += weightInfo.score;
      } else if (weightInfo.weight === 'weak') {
        weakScore += weightInfo.score;
      } else {
        weakScore += weightInfo.score * 0.5;
      }

      if (
        isActiveTargetNode(other, input.activeTargetPageIds, input.calendarEventIds)
      ) {
        reachedActiveTarget = true;
      }

      queue.push({ key: other, depth: current.depth + 1 });
    }
  }

  return { strongScore, weakScore, reachedActiveTarget };
}

function activeTargetPageIdsHas(set: ReadonlySet<string>, pageId: string): boolean {
  return set.has(pageId);
}

export function isNarrativelyConnected(score: ConnectivityScoreResult): boolean {
  if (score.strongScore >= 3) return true;
  if (score.strongScore + score.weakScore >= 4 && score.reachedActiveTarget) {
    return true;
  }
  return false;
}

export function hasNonParentNarrativeEdge(
  pageId: string,
  edges: readonly EntityGraphEdge[],
): boolean {
  const key = `wiki_page:${pageId}`;
  for (const edge of edges) {
    if (edge.relationKind === EntityRelationKinds.PAGE_PARENT) continue;
    if (nodeRefKey(edge.source) === key || nodeRefKey(edge.target) === key) {
      return true;
    }
  }
  return false;
}

export function hasThreadGraphEdge(
  pageId: string,
  edges: readonly EntityGraphEdge[],
): boolean {
  const key = `wiki_page:${pageId}`;
  for (const edge of edges) {
    if (
      edge.relationKind !== EntityRelationKinds.THREAD_RELATED &&
      edge.relationKind !== EntityRelationKinds.THREAD_PAYOFF
    ) {
      continue;
    }
    if (nodeRefKey(edge.source) === key || nodeRefKey(edge.target) === key) {
      return true;
    }
  }
  return false;
}

export function hasChronologyEdge(
  pageId: string,
  edges: readonly EntityGraphEdge[],
): boolean {
  const key = `wiki_page:${pageId}`;
  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CALENDAR_PREREQUISITE) continue;
    if (nodeRefKey(edge.source) === key || nodeRefKey(edge.target) === key) {
      return true;
    }
  }
  return false;
}
