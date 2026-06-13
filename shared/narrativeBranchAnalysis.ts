/**
 * Shared branch-graph traversal helpers (Layer 4 diagnostics).
 */
import {
  BranchNodeKinds,
  type BranchCondition,
  type NarrativeBranchEdge,
  type NarrativeBranchGraph,
} from './narrativeBranch.js';

export function dedupeBranchEdges(edges: NarrativeBranchEdge[]): NarrativeBranchEdge[] {
  const seen = new Set<string>();
  const out: NarrativeBranchEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.from}→${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }
  return out;
}

export function bfsReachable(
  entryNodeIds: readonly string[],
  edges: readonly NarrativeBranchEdge[],
  isEdgeTraversable?: (edge: NarrativeBranchEdge) => boolean,
): Set<string> {
  const reachable = new Set<string>();
  const queue = [...entryNodeIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const edge of edges) {
      if (edge.from !== id) continue;
      if (isEdgeTraversable && !isEdgeTraversable(edge)) continue;
      queue.push(edge.to);
    }
  }
  return reachable;
}

export function resolveEntryNodeIds(
  graph: NarrativeBranchGraph,
  activeNodeId: string | null,
): string[] {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  if (graph.entryNodeIds?.length) {
    return [...graph.entryNodeIds];
  }

  if (activeNodeId && nodeIds.has(activeNodeId)) {
    return [activeNodeId];
  }

  const inbound = new Map<string, number>();
  for (const node of graph.nodes) inbound.set(node.id, 0);
  for (const edge of graph.edges) {
    inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }

  const structuralRoots = graph.nodes
    .filter((n) => (inbound.get(n.id) ?? 0) === 0)
    .map((n) => n.id);

  const outcomeRoots = structuralRoots.filter(
    (id) => nodesById.get(id)?.kind === BranchNodeKinds.OUTCOME,
  );
  const candidates = outcomeRoots.length > 0 ? outcomeRoots : structuralRoots;

  if (candidates.length === 0) {
    const outcomes = graph.nodes
      .filter((n) => n.kind === BranchNodeKinds.OUTCOME)
      .map((n) => n.id)
      .sort();
    return outcomes.length > 0 ? [outcomes[0]] : [];
  }

  if (candidates.length === 1) return candidates;
  return [candidates.sort()[0]];
}

export function resolveActivationEntryNodeIds(
  graph: NarrativeBranchGraph,
  activeNodeId: string | null,
): string[] {
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  return resolveEntryNodeIds(graph, activeNodeId).filter(
    (id) => nodesById.get(id)?.kind === BranchNodeKinds.OUTCOME,
  );
}

export function liveGraphEdgeKey(
  sourcePageId: string,
  targetPageId: string,
  relationKind: string,
): string {
  return `${sourcePageId}:${targetPageId}:${relationKind}`;
}

export function graphEdgeConditionKey(condition: Extract<BranchCondition, { type: 'graph_edge' }>): string {
  return liveGraphEdgeKey(condition.sourcePageId, condition.targetPageId, condition.kind);
}
