/**
 * Layer 1 — party-to-faction reputation contracts (browser-safe).
 * Distinct from org-to-org diplomatic relations and adventure investigation ledger.
 * @see docs/architecture-internal/downtime-reputation.md
 */
export declare const CAMPAIGN_REPUTATION_SEMANTICS_VERSION = "campaign-reputation-v1";
export declare const REPUTATION_AXES: readonly ["trust", "notoriety"];
export type ReputationAxis = (typeof REPUTATION_AXES)[number];
export declare const REPUTATION_EVENT_KINDS: readonly ["drift", "band_crossing", "investigation", "rumor_spread", "project_outcome"];
export type ReputationEventKind = (typeof REPUTATION_EVENT_KINDS)[number];
export declare const REPUTATION_SUGGESTION_KINDS: readonly ["band_crossing", "investigation", "rumor_spread"];
export type ReputationSuggestionKind = (typeof REPUTATION_SUGGESTION_KINDS)[number];
export declare const REPUTATION_SUGGESTION_STATUSES: readonly ["pending", "accepted", "dismissed"];
export type ReputationSuggestionStatus = (typeof REPUTATION_SUGGESTION_STATUSES)[number];
export declare const REPUTATION_DIRECTIONS: readonly ["up", "down", "flat"];
export type ReputationDirection = (typeof REPUTATION_DIRECTIONS)[number];
export declare const REPUTATION_SOURCE_TYPES: readonly ["time_hook", "project_outcome", "haven_activity", "rumor_pressure", "creative_drift", "other"];
export type ReputationSourceType = (typeof REPUTATION_SOURCE_TYPES)[number];
export declare const REPUTATION_NARRATIVE_MAX_LENGTH = 200;
export type FactionReputationScores = {
    trust: number;
    notoriety: number;
    lastSimulatedAtEpochMinute: string | null;
};
export type CampaignReputationSimulationState = {
    version: typeof CAMPAIGN_REPUTATION_SEMANTICS_VERSION;
    factions: Record<string, FactionReputationScores>;
};
export type ReputationEventCore = {
    id: string;
    factionPageId: string;
    eventKind: ReputationEventKind;
    axis: ReputationAxis;
    direction: ReputationDirection;
    fromBand: string | null;
    toBand: string | null;
    title: string;
    narrative: string | null;
    occurredAtEpochMinute: string;
    sourceType: ReputationSourceType;
    sourceRef: string;
    projectId: string | null;
    havenWikiPageId: string | null;
    acceptedFromSuggestionId: string | null;
    createdAt: string;
};
export type ReputationSuggestionCore = {
    id: string;
    status: ReputationSuggestionStatus;
    kind: ReputationSuggestionKind;
    factionPageId: string;
    axis: ReputationAxis;
    direction: ReputationDirection;
    fromBand: string | null;
    toBand: string | null;
    title: string;
    narrative: string | null;
    occurredAtEpochMinute: string;
    sourceType: ReputationSourceType;
    sourceRef: string;
    idempotencyKey: string;
    projectId: string | null;
    havenWikiPageId: string | null;
    claimId: string | null;
    targetOrgPageId: string | null;
    proposedTrust: number | null;
    proposedNotoriety: number | null;
    resolvedByUserId: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
};
export declare function normalizeReputationAxis(raw: unknown): ReputationAxis | null;
export declare function normalizeReputationEventKind(raw: unknown): ReputationEventKind | null;
export declare function normalizeReputationSuggestionKind(raw: unknown): ReputationSuggestionKind | null;
export declare function normalizeReputationSuggestionStatus(raw: unknown): ReputationSuggestionStatus;
export declare function normalizeReputationDirection(raw: unknown): ReputationDirection;
export declare function normalizeReputationSourceType(raw: unknown): ReputationSourceType;
export declare function normalizeReputationNarrative(raw: unknown): string | null;
export declare function clampReputationScore(value: number): number;
export declare function defaultFactionReputationScores(): FactionReputationScores;
export declare function emptyCampaignReputationState(): CampaignReputationSimulationState;
export declare function parseCampaignReputationState(raw: unknown): CampaignReputationSimulationState;
export declare function serializeCampaignReputationState(state: CampaignReputationSimulationState): Record<string, unknown>;
export declare function formatReputationDirectionArrow(direction: ReputationDirection): string;
//# sourceMappingURL=reputationMetadata.d.ts.map