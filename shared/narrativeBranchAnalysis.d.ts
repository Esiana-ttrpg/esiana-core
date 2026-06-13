/**
 * Shared branch-graph traversal helpers (Layer 4 diagnostics).
 */
import { type BranchCondition, type NarrativeBranchEdge, type NarrativeBranchGraph } from './narrativeBranch.js';
export declare function dedupeBranchEdges(edges: NarrativeBranchEdge[]): NarrativeBranchEdge[];
export declare function bfsReachable(entryNodeIds: readonly string[], edges: readonly NarrativeBranchEdge[], isEdgeTraversable?: (edge: NarrativeBranchEdge) => boolean): Set<string>;
export declare function resolveEntryNodeIds(graph: NarrativeBranchGraph, activeNodeId: string | null): string[];
export declare function resolveActivationEntryNodeIds(graph: NarrativeBranchGraph, activeNodeId: string | null): string[];
export declare function liveGraphEdgeKey(sourcePageId: string, targetPageId: string, relationKind: string): string;
export declare function graphEdgeConditionKey(condition: Extract<BranchCondition, {
    type: 'graph_edge';
}>): string;
//# sourceMappingURL=narrativeBranchAnalysis.d.ts.map