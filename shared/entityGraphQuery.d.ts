/**
 * Pure graph analysis utilities over in-memory snapshots (Path B — GraphAnalysisSnapshot).
 */
import { type EntityGraphAdjacencyIndex, type EntityGraphEdge, type EntityGraphNodeRef, type EntityRelationKind, type GraphAnalysisSnapshot, type GraphCycleFinding, type GraphOrphanFinding } from './entityGraph.js';
export type NeighborDirection = 'outbound' | 'inbound' | 'both';
export type NeighborOptions = {
    direction?: NeighborDirection;
    kinds?: readonly EntityRelationKind[];
};
export declare function buildAdjacencyIndex(edges: readonly EntityGraphEdge[]): EntityGraphAdjacencyIndex;
export declare function neighbors(index: EntityGraphAdjacencyIndex, node: EntityGraphNodeRef, opts?: NeighborOptions): EntityGraphEdge[];
export type TraverseBfsResult = {
    visited: Set<string>;
    edges: EntityGraphEdge[];
    depthByNode: Map<string, number>;
};
export declare function traverseBfs(index: EntityGraphAdjacencyIndex, start: EntityGraphNodeRef, maxDepth: number, predicate?: (edge: EntityGraphEdge, depth: number) => boolean): TraverseBfsResult;
export declare function findCycles(edges: readonly EntityGraphEdge[], kindFilter?: readonly EntityRelationKind[]): GraphCycleFinding[];
export declare function findOrphans(narrativeNodes: readonly EntityGraphNodeRef[], edges: readonly EntityGraphEdge[], opts?: {
    excludeKinds?: readonly EntityRelationKind[];
}): GraphOrphanFinding[];
export type ShortestPathResult = {
    found: boolean;
    edges: EntityGraphEdge[];
    nodeKeys: string[];
};
export declare function shortestPath(index: EntityGraphAdjacencyIndex, from: EntityGraphNodeRef, to: EntityGraphNodeRef, opts?: {
    kinds?: readonly EntityRelationKind[];
    maxDepth?: number;
}): ShortestPathResult;
export declare function subgraph(nodeIds: readonly string[], edges: readonly EntityGraphEdge[]): EntityGraphEdge[];
export declare function attachAdjacency(snapshot: GraphAnalysisSnapshot): GraphAnalysisSnapshot;
export declare function collectReachableNodeKeys(index: EntityGraphAdjacencyIndex, roots: readonly EntityGraphNodeRef[], maxDepth: number): Set<string>;
export declare function uniqueNodeRefsFromEdges(edges: readonly EntityGraphEdge[]): EntityGraphNodeRef[];
export declare function nodeRefsFromKeys(keys: Iterable<string>): EntityGraphNodeRef[];
//# sourceMappingURL=entityGraphQuery.d.ts.map