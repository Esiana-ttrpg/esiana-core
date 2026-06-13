/**
 * Relations workspace render safety caps (browser-safe).
 */
export declare const RELATIONS_RENDER_CAP_DEFAULTS: {
    readonly maxVisibleNodes: 50;
    readonly maxVisibleEdges: 80;
};
export declare const RELATIONS_RENDER_CAP_LIMITS: {
    readonly minNodes: 20;
    readonly maxNodes: 100;
    readonly minEdges: 40;
    readonly maxEdges: 200;
};
export declare const PROJECTION_DERIVED: {
    readonly maxBlocCount: 12;
    readonly maxMembersPerBloc: 15;
    readonly maxNarrativeBullets: 5;
    readonly maxTopActorsPerTension: 3;
};
export type RelationsRenderCaps = {
    maxVisibleNodes: number;
    maxVisibleEdges: number;
};
export type RelationsTruncationReason = 'node_cap' | 'edge_cap' | 'bloc_cap' | 'member_cap' | 'cluster' | 'scope_limit' | 'none';
export type RelationsTruncation = {
    visibleNodes: number;
    hiddenNodes: number;
    visibleEdges: number;
    hiddenEdges: number;
    appliedNodeCap: number;
    appliedEdgeCap: number;
    truncationReason: RelationsTruncationReason;
    truncationReasons?: RelationsTruncationReason[];
};
export type RelationsCapsInput = {
    relationsMaxVisibleNodes?: number | null;
    relationsMaxVisibleEdges?: number | null;
};
export declare function clampCap(value: number | null | undefined, fallback: number, min: number, max: number): number;
export declare function resolveRelationsRenderCaps(input?: RelationsCapsInput | null): RelationsRenderCaps;
export declare function buildRelationsTruncation(input: {
    visibleNodes: number;
    totalNodes: number;
    visibleEdges: number;
    totalEdges: number;
    caps: RelationsRenderCaps;
    reasons?: RelationsTruncationReason[];
}): RelationsTruncation;
export declare function truncationUserMessage(truncation: RelationsTruncation): string | null;
//# sourceMappingURL=relationsRenderCaps.d.ts.map