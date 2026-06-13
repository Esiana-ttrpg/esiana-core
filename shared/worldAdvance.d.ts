/**
 * Layer 3 — GM-triggered world advance batch (chronology-first event fabric).
 */
import type { ConsequenceEffect } from './narrativeConsequence.js';
import type { WorldConditionSurface } from './worldConditionSurfaces.js';
import type { WorldAdvanceNarrativeSynthesis } from './worldAdvanceSynthesis.js';
import type { ChronologyDateParts } from './chronologyTypes.js';
import type { TimeAdvanceUnit } from './timeAdvanceUnits.js';
export type { TimeAdvanceUnit };
export declare const WORLD_ADVANCE_VERSION = "world-advance-v1";
export declare const WORLD_ADVANCE_CATEGORY = "World advance";
export declare const WorldAdvanceProjectionDomains: {
    readonly FACTION: "faction";
    readonly TERRITORIAL: "territorial";
    readonly ECONOMIC: "economic";
    readonly CONFLICT: "conflict";
    readonly SEASONAL: "seasonal";
    readonly NPC_MOBILITY: "npc_mobility";
};
export type WorldAdvanceProjectionDomain = (typeof WorldAdvanceProjectionDomains)[keyof typeof WorldAdvanceProjectionDomains];
export type WorldAdvanceTimeStep = {
    amount: number;
    unit: TimeAdvanceUnit;
};
export type EconomicSignalKind = 'scarcity' | 'surplus' | 'trade_disruption' | 'prosperity_growth' | 'prosperity_decline';
export type ConflictPhase = 'latent' | 'escalating' | 'active' | 'de_escalating' | 'resolved';
export type LocationEventKind = 'residency' | 'travel' | 'displacement' | 'intent';
export type WorldAdvanceEffectBase = {
    id: string;
    domain: WorldAdvanceProjectionDomain;
    sourceEventIds?: string[];
    sourcePageIds?: string[];
};
export type AppendOrgRelationEventEffect = WorldAdvanceEffectBase & {
    type: 'append_org_relation_event';
    domain: typeof WorldAdvanceProjectionDomains.FACTION;
    orgPageId: string;
    targetOrgId: string;
    relationType: string;
    stance: string;
    visibility?: string;
    note?: string;
    effectiveDate?: ChronologyDateParts;
};
export type TerritoryPressureEffect = WorldAdvanceEffectBase & {
    type: 'territory_pressure';
    domain: typeof WorldAdvanceProjectionDomains.TERRITORIAL;
    orgPageId?: string;
    regionPageId?: string;
    pressureLevel: 'low' | 'moderate' | 'high';
    note?: string;
};
export type SuggestBorderKeyframeEffect = WorldAdvanceEffectBase & {
    type: 'suggest_border_keyframe';
    domain: typeof WorldAdvanceProjectionDomains.TERRITORIAL;
    sceneObjectId: string;
    orgPageId?: string;
    stance?: string;
    note?: string;
};
export type EconomicSignalEffect = WorldAdvanceEffectBase & {
    type: 'economic_signal';
    domain: typeof WorldAdvanceProjectionDomains.ECONOMIC;
    targetKind: 'org' | 'location';
    pageId: string;
    signal: EconomicSignalKind;
    note?: string;
};
export type ConflictFrontEffect = WorldAdvanceEffectBase & {
    type: 'conflict_front';
    domain: typeof WorldAdvanceProjectionDomains.CONFLICT;
    label: string;
    phase: ConflictPhase;
    orgPageIds?: string[];
    regionPageIds?: string[];
    displacementNote?: string;
    casualtyNote?: string;
};
export type RecordSeasonContextEffect = WorldAdvanceEffectBase & {
    type: 'record_season_context';
    domain: typeof WorldAdvanceProjectionDomains.SEASONAL;
    regionPageId?: string;
    note?: string;
};
export type AppendLocationEventEffect = WorldAdvanceEffectBase & {
    type: 'append_location_event';
    domain: typeof WorldAdvanceProjectionDomains.NPC_MOBILITY;
    characterPageId: string;
    locationPageId: string;
    kind: LocationEventKind;
    note?: string;
    effectiveDate?: ChronologyDateParts;
};
export type SetCurrentLocationEffect = WorldAdvanceEffectBase & {
    type: 'set_current_location';
    domain: typeof WorldAdvanceProjectionDomains.NPC_MOBILITY;
    characterPageId: string;
    locationPageId: string | null;
};
export type DisplacementEffect = WorldAdvanceEffectBase & {
    type: 'displacement';
    domain: typeof WorldAdvanceProjectionDomains.NPC_MOBILITY;
    characterPageId: string;
    fromLocationPageId?: string;
    toLocationPageId?: string;
    note?: string;
};
/** Layer-2 consequence effects reusable in world-advance batches. */
export type ConsequenceBridgeEffect = WorldAdvanceEffectBase & {
    type: 'consequence_bridge';
    domain: WorldAdvanceProjectionDomain;
    consequence: ConsequenceEffect;
};
export type WorldAdvanceEffect = AppendOrgRelationEventEffect | TerritoryPressureEffect | SuggestBorderKeyframeEffect | EconomicSignalEffect | ConflictFrontEffect | RecordSeasonContextEffect | AppendLocationEventEffect | SetCurrentLocationEffect | DisplacementEffect | ConsequenceBridgeEffect;
export type WorldAdvanceBatchRequest = {
    version?: typeof WORLD_ADVANCE_VERSION;
    advanceTime?: WorldAdvanceTimeStep;
    effects: WorldAdvanceEffect[];
    note?: string;
    /** Client-supplied idempotency for safe retries of the whole batch. */
    batchIdempotencyKey?: string;
};
export type WorldAdvanceEffectPreview = {
    effectId: string;
    domain: WorldAdvanceProjectionDomain;
    type: string;
    summary: string;
    warnings: string[];
    pendingConfirmations: string[];
};
export type WorldAdvancePreview = {
    version: typeof WORLD_ADVANCE_VERSION;
    asOfEpochMinute: string;
    asOfLabel: string | null;
    projectedEpochMinute: string;
    effectPreviews: WorldAdvanceEffectPreview[];
    conditionSurfaces: WorldConditionSurface[];
    narrativeSynthesis: WorldAdvanceNarrativeSynthesis;
    warnings: string[];
};
export type WorldAdvanceApplyResult = WorldAdvancePreview & {
    batchId: string;
    chronologyEventId: string;
    appliedCount: number;
    skippedCount: number;
    receiptKeys: string[];
};
export type WorldAdvanceBatchPayload = {
    version: typeof WORLD_ADVANCE_VERSION;
    batchId: string;
    actorUserId: string;
    effects: WorldAdvanceEffect[];
    note?: string;
    advanceTime?: WorldAdvanceTimeStep;
    previousEpochMinute: string;
    nextEpochMinute: string;
    appliedCount: number;
    skippedCount: number;
    synthesisProjection?: WorldAdvanceNarrativeSynthesis;
};
export type WorldAdvanceBatchSummary = {
    chronologyEventId: string;
    batchId: string;
    title: string;
    targetEpochMinute: string;
    appliedCount: number;
    effectCount: number;
    headline: string | null;
    createdAt: string;
};
export declare function parseWorldAdvanceEffect(raw: unknown): WorldAdvanceEffect | null;
export declare function parseWorldAdvanceBatchRequest(raw: unknown): WorldAdvanceBatchRequest | null;
export declare function parseWorldAdvanceBatchPayload(raw: unknown): WorldAdvanceBatchPayload | null;
//# sourceMappingURL=worldAdvance.d.ts.map