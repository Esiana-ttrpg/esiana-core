/**
 * Layer 3 — rumor engine ontology (claim vs circulation vs spread).
 */
import type { LoreClaimRecord, LoreInterpretationAccountRecord } from './loreKnowledge.js';
export declare const RUMOR_ENGINE_VERSION = "rumor-engine-v1";
export type EpochMinuteString = string;
export declare const RumorStances: {
    readonly ASSERTS: "asserts";
    readonly DENIES: "denies";
    readonly DISTORTS: "distorts";
    readonly MYTHOLOGIZES: "mythologizes";
    readonly SATIRIZES: "satirizes";
};
export type RumorStance = (typeof RumorStances)[keyof typeof RumorStances];
export declare const AwarenessScopes: {
    readonly LOCAL: "local";
    readonly REGIONAL: "regional";
    readonly FACTIONAL: "factional";
    readonly GLOBAL: "global";
};
export type AwarenessScope = (typeof AwarenessScopes)[keyof typeof AwarenessScopes];
export declare const CirculationEdgeKinds: {
    readonly CIRCULATION: "circulation";
    readonly RETRACTION: "retraction";
};
export type CirculationEdgeKind = (typeof CirculationEdgeKinds)[keyof typeof CirculationEdgeKinds];
export declare const CirculationTargetKinds: {
    readonly REGION: "region";
    readonly FACTION: "faction";
};
export type CirculationTargetKind = (typeof CirculationTargetKinds)[keyof typeof CirculationTargetKinds];
export declare const CirculationVisibilities: {
    readonly PARTY: "PARTY";
    readonly GM_ONLY: "GM_ONLY";
};
export type CirculationVisibility = (typeof CirculationVisibilities)[keyof typeof CirculationVisibilities];
/** Append-only propagation edge (API / projection shape). */
export type RumorCirculationRecord = {
    id: string;
    stableKey: string;
    campaignId: string;
    claimId: string;
    edgeKind: CirculationEdgeKind;
    targetKind: CirculationTargetKind;
    targetRef: string;
    stance: RumorStance;
    awarenessScope: AwarenessScope;
    visibility: CirculationVisibility;
    spreadEventId: string;
    circulatedAtEpochMinute: EpochMinuteString;
    supersedesCirculationId?: string | null;
};
export declare const InclusionReasonRanks: {
    readonly SUBJECT_LOCALITY: 1;
    readonly SOURCE_LOCALITY: 2;
    readonly EXPLICIT_SPREAD: 3;
    readonly INTERPRETATION_REGION: 4;
    readonly ORG_GRAPH: 5;
};
export type InclusionReasonRank = (typeof InclusionReasonRanks)[keyof typeof InclusionReasonRanks];
export type InclusionReasonCode = 'subject_locality' | 'source_locality' | 'explicit_spread' | 'interpretation_region' | 'org_graph';
export type InclusionReason = {
    rank: InclusionReasonRank;
    code: InclusionReasonCode;
};
export type RumorProjectionContext = {
    asOfEpochMinute: EpochMinuteString;
    isElevated: boolean;
};
export type RegionProjectionScope = {
    anchorLocationPageId: string;
    regionKey: string | null;
    locationPageIds: string[];
    regionLabels: string[];
    orgPageIdsInScope: string[];
};
export type FactionProjectionScope = {
    orgPageId: string;
    orgRegion: string | null;
    relatedOrgPageIds: string[];
};
export type ContradictionPerspective = {
    scopeKind: CirculationTargetKind;
    scopeRef: string;
    scopeLabel?: string | null;
    stance: RumorStance;
    circulationCount: number;
    latestCirculatedAt: EpochMinuteString;
    summary: string;
};
export type ContradictionBundle = {
    groupId: string | null;
    claims: LoreClaimRecord[];
    interpretations: LoreInterpretationAccountRecord[];
    isContested: boolean;
    contestReasons: string[];
    perspectives: ContradictionPerspective[];
};
export type RumorFeedItem = {
    claim: LoreClaimRecord;
    primaryCirculation: RumorCirculationRecord | null;
    activeCirculations: RumorCirculationRecord[];
    stance: RumorStance;
    awarenessScope: AwarenessScope;
    primaryInclusionReason: InclusionReason;
    inclusionReasons: InclusionReason[];
    firstCirculatedAt: EpochMinuteString | null;
    lastCirculatedAt: EpochMinuteString | null;
};
export type RumorFeedProjection = {
    version: typeof RUMOR_ENGINE_VERSION;
    asOfEpochMinute: EpochMinuteString;
    isElevated: boolean;
    items: RumorFeedItem[];
    contradictionBundles: ContradictionBundle[];
};
export declare function compareEpochMinutes(a: EpochMinuteString, b: EpochMinuteString): number;
export declare function isEpochAtOrBefore(epoch: EpochMinuteString, asOf: EpochMinuteString): boolean;
export declare function inferAwarenessScopeForTarget(targetKind: CirculationTargetKind, override?: AwarenessScope | null): AwarenessScope;
export declare function normalizeRumorStance(raw: string | null | undefined): RumorStance;
export declare function normalizeAwarenessScope(raw: string | null | undefined): AwarenessScope;
export declare function normalizeCirculationVisibility(raw: string | null | undefined): CirculationVisibility;
//# sourceMappingURL=rumorEngine.d.ts.map