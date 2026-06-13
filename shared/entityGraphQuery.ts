/**
 * Pure graph analysis utilities over in-memory snapshots (Path B — GraphAnalysisSnapshot).
 */
import {
  EntityRelationKinds,
  type EntityGraphAdjacencyIndex,
  type EntityGraphEdge,
  type EntityGraphNodeRef,
  type EntityRelationKind,
  type GraphAnalysisSnapshot,
  type GraphCycleFinding,
  type GraphOrphanFinding,
  nodeRefKey,
  parseNodeRefKey,
} from './entityGraph.js';

export type NeighborDirection = 'outbound' | 'inbound' | 'both';

export type NeighborOptions = {
  direction?: NeighborDirection;
  kinds?: readonly EntityRelationKind[];
};

export function buildAdjacencyIndex(edges: readonly EntityGraphEdge[]): EntityGraphAdjacencyIndex {
  const outbound = new Map<string, EntityGraphEdge[]>();
  const inbound = new Map<string, EntityGraphEdge[]>();

  for (const edge of edges) {
    const sourceKey = nodeRefKey(edge.source);
    const targetKey = nodeRefKey(edge.target);
    const out = outbound.get(sourceKey) ?? [];
    out.push(edge);
    outbound.set(sourceKey, out);
    const inn = inbound.get(targetKey) ?? [];
    inn.push(edge);
    inbound.set(targetKey, inn);
  }

  return { outbound, inbound };
}

function edgeMatchesKinds(edge: EntityGraphEdge, kinds?: readonly EntityRelationKind[]): boolean {
  if (!kinds || kinds.length === 0) return true;
  return kinds.includes(edge.relationKind);
}

export function neighbors(
  index: EntityGraphAdjacencyIndex,
  node: EntityGraphNodeRef,
  opts: NeighborOptions = {},
): EntityGraphEdge[] {
  const key = nodeRefKey(node);
  const direction = opts.direction ?? 'both';
  const rows: EntityGraphEdge[] = [];

  if (direction === 'outbound' || direction === 'both') {
    for (const edge of index.outbound.get(key) ?? []) {
      if (edgeMatchesKinds(edge, opts.kinds)) rows.push(edge);
    }
  }
  if (direction === 'inbound' || direction === 'both') {
    for (const edge of index.inbound.get(key) ?? []) {
      if (edgeMatchesKinds(edge, opts.kinds)) rows.push(edge);
    }
  }

  return rows;
}

export type TraverseBfsResult = {
  visited: Set<string>;
  edges: EntityGraphEdge[];
  depthByNode: Map<string, number>;
};

export function traverseBfs(
  index: EntityGraphAdjacencyIndex,
  start: EntityGraphNodeRef,
  maxDepth: number,
  predicate?: (edge: EntityGraphEdge, depth: number) => boolean,
): TraverseBfsResult {
  const startKey = nodeRefKey(start);
  const visited = new Set<string>([startKey]);
  const edges: EntityGraphEdge[] = [];
  const depthByNode = new Map<string, number>([[startKey, 0]]);
  const queue: Array<{ node: EntityGraphNodeRef; depth: number }> = [{ node: start, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const edge of neighbors(index, current.node, { direction: 'both' })) {
      if (predicate && !predicate(edge, current.depth + 1)) continue;

      const other =
        nodeRefKey(edge.source) === nodeRefKey(current.node) ? edge.target : edge.source;
      const otherKey = nodeRefKey(other);

      edges.push(edge);

      if (!visited.has(otherKey)) {
        visited.add(otherKey);
        depthByNode.set(otherKey, current.depth + 1);
        if (current.depth + 1 < maxDepth) {
          queue.push({ node: other, depth: current.depth + 1 });
        }
      }
    }
  }

  return { visited, edges, depthByNode };
}

export function findCycles(
  edges: readonly EntityGraphEdge[],
  kindFilter?: readonly EntityRelationKind[],
): GraphCycleFinding[] {
  const filtered = kindFilter?.length
    ? edges.filter((e) => kindFilter.includes(e.relationKind))
    : [...edges];

  const index = buildAdjacencyIndex(filtered);
  const findings: GraphCycleFinding[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  const dfs = (key: string, kind: EntityRelationKind): void => {
    visited.add(key);
    stack.add(key);
    path.push(key);

    for (const edge of index.outbound.get(key) ?? []) {
      if (edge.relationKind !== kind) continue;
      const nextKey = nodeRefKey(edge.target);
      if (!visited.has(nextKey)) {
        dfs(nextKey, kind);
      } else if (stack.has(nextKey)) {
        const cycleStart = path.indexOf(nextKey);
        if (cycleStart >= 0) {
          findings.push({
            kind,
            nodeIds: path.slice(cycleStart).map((k) => k.split(':').slice(1).join(':')),
          });
        }
      }
    }

    path.pop();
    stack.delete(key);
  };

  const kinds = kindFilter?.length
    ? [...kindFilter]
    : [...new Set(filtered.map((e) => e.relationKind))];

  for (const kind of kinds) {
    visited.clear();
    stack.clear();
    for (const edge of filtered) {
      if (edge.relationKind !== kind) continue;
      const startKey = nodeRefKey(edge.source);
      if (!visited.has(startKey)) {
        dfs(startKey, kind);
      }
    }
  }

  return findings;
}

export function findOrphans(
  narrativeNodes: readonly EntityGraphNodeRef[],
  edges: readonly EntityGraphEdge[],
  opts?: { excludeKinds?: readonly EntityRelationKind[] },
): GraphOrphanFinding[] {
  const exclude = new Set(opts?.excludeKinds ?? [EntityRelationKinds.PAGE_PARENT]);
  const findings: GraphOrphanFinding[] = [];

  for (const node of narrativeNodes) {
    const key = nodeRefKey(node);
    const hasEdge = edges.some((edge) => {
      if (exclude.has(edge.relationKind)) return false;
      return nodeRefKey(edge.source) === key || nodeRefKey(edge.target) === key;
    });
    if (!hasEdge) {
      findings.push({ node });
    }
  }

  return findings;
}

export type ShortestPathResult = {
  found: boolean;
  edges: EntityGraphEdge[];
  nodeKeys: string[];
};

export function shortestPath(
  index: EntityGraphAdjacencyIndex,
  from: EntityGraphNodeRef,
  to: EntityGraphNodeRef,
  opts?: { kinds?: readonly EntityRelationKind[]; maxDepth?: number },
): ShortestPathResult {
  const fromKey = nodeRefKey(from);
  const toKey = nodeRefKey(to);
  if (fromKey === toKey) {
    return { found: true, edges: [], nodeKeys: [fromKey] };
  }

  const maxDepth = opts?.maxDepth ?? 12;
  const visited = new Set<string>([fromKey]);
  const prev = new Map<string, { key: string; edge: EntityGraphEdge }>();
  const queue: Array<{ node: EntityGraphNodeRef; depth: number }> = [{ node: from, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const edge of neighbors(index, current.node, {
      direction: 'both',
      kinds: opts?.kinds,
    })) {
      const other =
        nodeRefKey(edge.source) === nodeRefKey(current.node) ? edge.target : edge.source;
      const otherKey = nodeRefKey(other);
      if (visited.has(otherKey)) continue;
      visited.add(otherKey);
      prev.set(otherKey, { key: nodeRefKey(current.node), edge });

      if (otherKey === toKey) {
        const nodeKeys = [toKey];
        const edges: EntityGraphEdge[] = [];
        let walk = toKey;
        while (walk !== fromKey) {
          const step = prev.get(walk);
          if (!step) break;
          edges.unshift(step.edge);
          nodeKeys.unshift(step.key);
          walk = step.key;
        }
        return { found: true, edges, nodeKeys };
      }

      queue.push({ node: other, depth: current.depth + 1 });
    }
  }

  return { found: false, edges: [], nodeKeys: [] };
}

export function subgraph(
  nodeIds: readonly string[],
  edges: readonly EntityGraphEdge[],
): EntityGraphEdge[] {
  const allowed = new Set(nodeIds);
  return edges.filter(
    (edge) =>
      allowed.has(edge.source.entityId) && allowed.has(edge.target.entityId),
  );
}

export function attachAdjacency(snapshot: GraphAnalysisSnapshot): GraphAnalysisSnapshot {
  return {
    ...snapshot,
    adjacency: buildAdjacencyIndex(snapshot.edges),
  };
}

export function collectReachableNodeKeys(
  index: EntityGraphAdjacencyIndex,
  roots: readonly EntityGraphNodeRef[],
  maxDepth: number,
): Set<string> {
  const reachable = new Set<string>();
  for (const root of roots) {
    const { visited } = traverseBfs(index, root, maxDepth);
    for (const key of visited) reachable.add(key);
  }
  return reachable;
}

export function uniqueNodeRefsFromEdges(edges: readonly EntityGraphEdge[]): EntityGraphNodeRef[] {
  const map = new Map<string, EntityGraphNodeRef>();
  for (const edge of edges) {
    map.set(nodeRefKey(edge.source), edge.source);
    map.set(nodeRefKey(edge.target), edge.target);
  }
  return [...map.values()];
}

export function nodeRefsFromKeys(keys: Iterable<string>): EntityGraphNodeRef[] {
  const out: EntityGraphNodeRef[] = [];
  for (const key of keys) {
    const ref = parseNodeRefKey(key);
    if (ref) out.push(ref);
  }
  return out;
}
