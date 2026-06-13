/**
 * Layer 1 — unified narrative projection semantics.
 * Centralizes viewer context, revelation, role visibility, and temporal policy.
 * @see docs/architecture-internal/narrative-projection-semantics.md
 */
import { type ContentRevelationState } from './contentPresence.js';
import { isEntityDiscovered, projectPageDiscovery, resolvePresenceState, type DiscoveryProjection, type RevelationProvenance } from './discoveryProjection.js';
import { type PresenceContext } from './mapPresence.js';
import { type NarrativeLifecycleState } from './narrativeLifecycle.js';
import type { ChronologyDateParts } from './chronologyTypes.js';
export type NarrativePerspective = 'party' | 'elevated';
export declare const NarrativeVisibilityTier: {
    readonly PUBLIC: "PUBLIC";
    readonly PARTY: "PARTY";
    readonly ELEVATED_ONLY: "ELEVATED_ONLY";
    readonly SECRET: "SECRET";
};
export type NarrativeVisibilityTierValue = (typeof NarrativeVisibilityTier)[keyof typeof NarrativeVisibilityTier];
export declare const TemporalProjectionSurface: {
    readonly MAP_SCENE: "map_scene";
    readonly LORE_SUMMARY: "lore_summary";
    readonly CHRONOLOGY_TIMELINE: "chronology_timeline";
    readonly ENTITY_GRAPH: "entity_graph";
    readonly SESSION_CHRONICLE: "session_chronicle";
};
export type TemporalProjectionSurfaceValue = (typeof TemporalProjectionSurface)[keyof typeof TemporalProjectionSurface];
export declare const TemporalHistoricalMode: {
    readonly EPOCH_VIEW: "epoch_view";
    readonly DATE_PARTS_VIEW: "date_parts_view";
    readonly PRESENT_ONLY: "present_only";
};
export type TemporalHistoricalModeValue = (typeof TemporalHistoricalMode)[keyof typeof TemporalHistoricalMode];
export interface TemporalProjectionPolicy {
    surface: TemporalProjectionSurfaceValue;
    historicalMode: TemporalHistoricalModeValue;
    partyClampsToCampaignPresent: boolean;
    elevatedAcceptsHistoricalInput: boolean;
}
export declare const TEMPORAL_PROJECTION_POLICIES: Record<TemporalProjectionSurfaceValue, TemporalProjectionPolicy>;
export interface NarrativeViewerCapabilities {
    canManageChronology: boolean;
    canRevealContent: boolean;
    canUseGhostMode: boolean;
    isElevatedWiki: boolean;
    isElevatedMap: boolean;
}
export interface CampaignChronologyNow {
    epochMinute: bigint;
    dateParts: ChronologyDateParts;
}
export interface NarrativeViewerContext {
    perspective: NarrativePerspective;
    role: string | null;
    capabilities: NarrativeViewerCapabilities;
    campaignNow: CampaignChronologyNow;
}
export type RevelationDenyReason = 'visible' | 'unrevealed' | 'draft';
export interface RevelationProjection {
    visible: boolean;
    presenceState: ContentRevelationState;
    denyReason?: RevelationDenyReason;
    revelation?: RevelationProvenance;
}
export type RoleVisibilityDenyReason = 'visible' | 'role_elevated_only' | 'role_secret';
export interface RoleVisibilityProjection {
    visible: boolean;
    tier: NarrativeVisibilityTierValue;
    denyReason?: RoleVisibilityDenyReason;
}
export interface TemporalViewResolution {
    policy: TemporalProjectionPolicy;
    effectiveEpochMinute: bigint;
    effectiveDateParts: ChronologyDateParts;
    isCampaignPresent: boolean;
    requestedEpochIgnored: boolean;
    requestedDateIgnored: boolean;
}
export interface WikiPageVisibilityProjection {
    visible: boolean;
    revelation: RevelationProjection;
    discovery: DiscoveryProjection;
}
export interface TimelineEventVisibilityProjection {
    visible: boolean;
    revelation: RevelationProjection;
    role: RoleVisibilityProjection;
}
export interface EntityRelationVisibilityProjection {
    visible: boolean;
    role: RoleVisibilityProjection;
    temporal: TemporalViewResolution;
}
export interface MapSceneProjectionContext {
    presenceContext: PresenceContext;
    temporal: TemporalViewResolution;
}
export type BuildNarrativeViewerContextInput = {
    role: string | null;
    campaignNow: CampaignChronologyNow;
    allowPlayerChronologyManagement?: boolean;
};
export declare function isElevatedRole(role: string | null | undefined): boolean;
export declare function derivePerspective(isElevated: boolean): NarrativePerspective;
export declare function buildNarrativeViewerCapabilities(role: string | null, allowPlayerChronologyManagement?: boolean): NarrativeViewerCapabilities;
export declare function buildNarrativeViewerContext(input: BuildNarrativeViewerContextInput): NarrativeViewerContext;
export declare function isManagerView(ctx: NarrativeViewerContext): boolean;
export declare function fromChronologyVisibility(visibility: string | null | undefined): NarrativeVisibilityTierValue;
export declare function fromWikiMapVisibility(visibility: string | null | undefined): NarrativeVisibilityTierValue;
export declare function fromRelationVisibility(visibility: string | null | undefined): NarrativeVisibilityTierValue;
export declare function projectRoleVisibility(tier: NarrativeVisibilityTierValue, ctx: NarrativeViewerContext): RoleVisibilityProjection;
export declare function projectRevelation(presenceState: ContentRevelationState, ctx: NarrativeViewerContext, revelation?: RevelationProvenance): RevelationProjection;
export declare function projectRevelationFromMap(presenceState: ContentRevelationState, ctx: NarrativeViewerContext): RevelationProjection;
/**
 * Merge order: ContentPresenceState override → keyframe revelation → column revelation.
 */
export declare function resolveMapObjectRevelationState(input: {
    columnRevelation?: string | null;
    keyframeRevelation?: string | null;
    presenceOverride?: ContentRevelationState | null;
}): ContentRevelationState;
export declare function normalizeChronologyDateInput(raw: unknown): ChronologyDateParts | null;
export declare function resolveTemporalView(input: {
    surface: TemporalProjectionSurfaceValue;
    ctx: NarrativeViewerContext;
    requestedEpochMinute?: bigint | string | null;
    requestedDateParts?: ChronologyDateParts | null;
}): TemporalViewResolution;
export declare function projectWikiPageVisibility(pageId: string, presenceMap: Map<string, ContentRevelationState>, ctx: NarrativeViewerContext, revelation?: RevelationProvenance): WikiPageVisibilityProjection;
export declare function projectTimelineEventVisibility(eventId: string, eventVisibility: string | null | undefined, presenceMap: Map<string, ContentRevelationState>, ctx: NarrativeViewerContext, revelation?: RevelationProvenance): TimelineEventVisibilityProjection;
export declare function isTimelineEventVisible(projection: TimelineEventVisibilityProjection): boolean;
export declare function projectLoreAtDate(ctx: NarrativeViewerContext, requestedViewDate?: ChronologyDateParts | null): TemporalViewResolution;
export declare function projectEntityRelation(visibility: string | null | undefined, ctx: NarrativeViewerContext): EntityRelationVisibilityProjection;
export declare function isEntityRelationVisible(projection: EntityRelationVisibilityProjection): boolean;
export declare function projectMapSceneContext(ctx: NarrativeViewerContext, options: {
    requestedViewEpochMinute?: string | null;
    enabledLayerIds: Set<string>;
    editorGhostMode?: boolean;
    debugPresence?: boolean;
    canViewWiki: (visibility: string) => boolean;
}): MapSceneProjectionContext;
export declare function isPresenceVisibleToContext(presenceState: ContentRevelationState, ctx: NarrativeViewerContext): boolean;
export declare function buildRevelationViewerContext(input: {
    role: string | null;
    isManagerView?: boolean;
    canManage?: boolean;
    campaignNow?: CampaignChronologyNow;
}): NarrativeViewerContext;
export type PublishedNarrativeSubjectKind = 'quest' | 'open_thread' | 'orchestration_page';
export type PublishedNarrativeArtifact = {
    included: boolean;
    blocks: unknown[];
    metadata: Record<string, unknown> | null;
    lifecycleState: NarrativeLifecycleState | null;
    denyReason?: 'locked' | 'orchestration_only' | 'role_hidden';
};
/**
 * Layer 2 — controlled export from orchestration data to player-visible surfaces.
 */
export declare function projectPublishedNarrative(input: {
    subjectKind: PublishedNarrativeSubjectKind;
    blocks: unknown;
    metadata: unknown;
    visibility?: string;
    viewerContext: NarrativeViewerContext;
    lifecycleState: NarrativeLifecycleState;
}): PublishedNarrativeArtifact;
export { isEntityDiscovered, projectPageDiscovery, resolvePresenceState, };
//# sourceMappingURL=narrativeProjection.d.ts.map