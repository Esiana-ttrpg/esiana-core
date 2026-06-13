/**
 * Layer 5 — derive storyboard edges from entity graph with explainable provenance.
 */
import { type EntityGraphEdge, type EntityRelationKind } from './entityGraph.js';
import type { StoryboardActiveMode } from './storyboardProjection.js';
export type StoryboardDerivationDomain = 'wiki_metadata' | 'entity_graph' | 'calendar' | 'manual';
export interface StoryboardEdgeProvenance {
    derivationSource: string;
    derivationDomain: StoryboardDerivationDomain;
    explanationTemplate: string;
    editable: boolean;
    editField?: string;
}
/** Canonical metadata field → human explanation for each relation kind used on the storyboard. */
export declare const STORYBOARD_EDGE_PROVENANCE: Record<string, StoryboardEdgeProvenance>;
export declare const STORYBOARD_MODE_RELATION_KINDS: Record<StoryboardActiveMode, readonly EntityRelationKind[]>;
export declare const STORYBOARD_MODE_LABELS: Record<StoryboardActiveMode, string>;
export interface StoryboardProjectedEdge {
    sourceId: string;
    targetId: string;
    relationKind: EntityRelationKind;
    derivationSource: string;
    derivationDomain: StoryboardDerivationDomain;
    explanation: string;
    activeMode: StoryboardActiveMode;
    editable: boolean;
    editField?: string;
    edgeKind: 'required' | 'optional' | 'branch';
}
export declare function buildModeLegend(activeMode: StoryboardActiveMode): string;
export declare function deriveStoryboardEdges(input: {
    activeMode: StoryboardActiveMode;
    visibleNodeIds: Set<string>;
    entityGraphEdges: readonly EntityGraphEdge[];
    entityTitles: Map<string, string>;
}): StoryboardProjectedEdge[];
export declare function assertStoryboardEdgeProvenance(edges: StoryboardProjectedEdge[]): void;
//# sourceMappingURL=storyboardEdgeDerivation.d.ts.map