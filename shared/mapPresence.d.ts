/**
 * Map presence resolver — shared between backend and frontend.
 * Single pipeline for layers, revelation, temporal windows, and wiki inheritance.
 *
 * PRESENCE INPUTS: layerId, visibility, revelation, temporal bounds, wiki inheritance only.
 * groupId and UI filters must NEVER be read here — see docs/plans/map-presence-visibility.md.
 */
export declare const MapRevelationStates: {
    readonly REVEALED: "REVEALED";
    readonly HIDDEN: "HIDDEN";
    readonly DRAFT: "DRAFT";
};
export type MapRevelationState = (typeof MapRevelationStates)[keyof typeof MapRevelationStates];
export declare const WikiVisibilityTier: {
    readonly PUBLIC: "Public";
    readonly PARTY: "Party";
    readonly DM_ONLY: "DM_Only";
};
export type PresenceDenyReason = 'visible' | 'layer_disabled' | 'role_dm_only' | 'unrevealed' | 'draft' | 'before_visible_from' | 'after_visible_until' | 'inherited_wiki_hidden' | 'inherited_map_hidden' | 'missing_target';
export type PresenceResolution = {
    visible: boolean;
    reason: PresenceDenyReason;
    temporal?: {
        viewEpochMinute: string;
        visibleFromEpochMinute?: string | null;
        visibleUntilEpochMinute?: string | null;
        activeKeyframeId?: string | null;
    };
};
export type MapSceneObjectPresenceInput = {
    id: string;
    layerId?: string | null;
    visibility?: string | null;
    revelation?: string | null;
    visibleFromEpochMinute?: bigint | string | null;
    visibleUntilEpochMinute?: bigint | string | null;
    targetPageId?: string | null;
    targetAssetId?: string | null;
    targetPageVisibility?: string | null;
    targetAssetVisibility?: string | null;
    nestedMapHostVisibility?: string | null;
    /** Pin-like objects require a link target */
    requiresTarget?: boolean;
};
export type PresenceContext = {
    isElevated: boolean;
    enabledLayerIds: Set<string>;
    viewEpochMinute: bigint | null;
    editorGhostMode?: boolean;
    debugPresence?: boolean;
    canViewWiki: (visibility: string) => boolean;
};
/**
 * Full presence pipeline. When editorGhostMode is on (elevated only), temporal/revelation
 * do not deny visibility but reasons are still computed for badges.
 */
export declare function resolveMapObjectPresenceDetailed(object: MapSceneObjectPresenceInput, ctx: PresenceContext): PresenceResolution;
export declare function resolveMapObjectPresence(object: MapSceneObjectPresenceInput, ctx: PresenceContext): 'visible' | 'hidden' | 'gm-only-hint';
/** Clamp party temporal queries to campaign now. */
export declare function clampViewEpochMinuteForParty(requested: bigint | string | null | undefined, campaignNow: bigint, isElevated: boolean): bigint;
/** Normalized [0,1] point to display pixel space. */
export declare function normalizedPointToDisplay(coordinates: [number, number], width: number, height: number): {
    x: number;
    y: number;
};
/** Display pixel space to normalized [0,1]. */
export declare function displayToNormalizedPoint(x: number, y: number, width: number, height: number): [number, number];
export { parsePointGeometry, polygonGeometry, lineStringGeometry } from './mapGeometry';
export declare function pointGeometry(coordinates: [number, number]): {
    type: 'Point';
    coordinates: [number, number];
};
//# sourceMappingURL=mapPresence.d.ts.map