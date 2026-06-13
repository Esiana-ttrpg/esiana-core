/**
 * Layer 4 — weighted narrative connectivity traversal.
 */
import { type EntityGraphEdge, type EntityRelationKind } from './entityGraph.js';
export type NarrativeConnectivityWeight = 'strong' | 'weak' | 'structural';
export declare const EDGE_CONNECTIVITY_WEIGHT: Partial<Record<EntityRelationKind, NarrativeConnectivityWeight>>;
export declare const CONNECTIVITY_MAX_DEPTH = 6;
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
export declare function computeConnectivityScore(input: ConnectivityTraversalInput): ConnectivityScoreResult;
export declare function isNarrativelyConnected(score: ConnectivityScoreResult): boolean;
export declare function hasNonParentNarrativeEdge(pageId: string, edges: readonly EntityGraphEdge[]): boolean;
export declare function hasThreadGraphEdge(pageId: string, edges: readonly EntityGraphEdge[]): boolean;
export declare function hasChronologyEdge(pageId: string, edges: readonly EntityGraphEdge[]): boolean;
//# sourceMappingURL=narrativeConnectivity.d.ts.map