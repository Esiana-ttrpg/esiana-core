/**
 * Layer 1 — party-to-faction reputation simulation (browser-safe pure logic).
 * @see docs/architecture-internal/downtime-reputation.md
 */
import { CAMPAIGN_REPUTATION_SEMANTICS_VERSION, type FactionReputationScores, type ReputationAxis, type ReputationDirection, type ReputationEventKind, type ReputationSourceType, type ReputationSuggestionKind } from './reputationMetadata.js';
export declare const REPUTATION_SIMULATION_VERSION = "reputation-simulation-v1";
export type AdvanceMagnitude = 'tiny' | 'small' | 'medium' | 'large' | 'massive';
export type ReputationBandTone = 'neutral' | 'warning' | 'escalation';
export type ReputationBand = {
    bandId: string;
    bandLabel: string;
    tone: ReputationBandTone;
};
export type ReputationFactionDrivers = {
    havenNotorietyBand: string | null;
    havenWikiPageId: string | null;
    negativeRumorCount: number;
    positiveProjectBoost: boolean;
    stalledProjectAtHaven: boolean;
    creativeDriftPressure: number;
};
export type ReputationAdvanceAutoEvent = {
    factionPageId: string;
    eventKind: ReputationEventKind;
    axis: ReputationAxis;
    direction: ReputationDirection;
    fromBand: string;
    toBand: string;
    title: string;
    narrative: string;
    sourceType: ReputationSourceType;
    sourceRef: string;
    projectId?: string | null;
    havenWikiPageId?: string | null;
};
export type ReputationAdvanceSuggestion = {
    kind: ReputationSuggestionKind;
    factionPageId: string;
    axis: ReputationAxis;
    direction: ReputationDirection;
    fromBand: string;
    toBand: string;
    title: string;
    narrative: string;
    sourceType: ReputationSourceType;
    sourceRef: string;
    idempotencyKey: string;
    proposedTrust: number;
    proposedNotoriety: number;
    projectId?: string | null;
    havenWikiPageId?: string | null;
    claimId?: string | null;
    targetOrgPageId?: string | null;
};
export type ReputationAdvanceInput = {
    factionPageId: string;
    scores: FactionReputationScores;
    elapsedMinutes: bigint;
    advanceMagnitude: AdvanceMagnitude;
    drivers: ReputationFactionDrivers;
    batchId: string;
};
export type ReputationAdvanceFactionResult = {
    nextScores: FactionReputationScores;
    autoEvents: ReputationAdvanceAutoEvent[];
    pendingSuggestions: ReputationAdvanceSuggestion[];
};
export declare function bandIndexForValue(value: number): number;
export declare function formatReputationAxisBand(axis: ReputationAxis, value: number): ReputationBand;
export declare function advanceFactionReputation(input: ReputationAdvanceInput): ReputationAdvanceFactionResult;
export declare function applyReputationScoresAfterAdvance(scores: FactionReputationScores, nextEpochMinute: string): FactionReputationScores;
export declare function getOrCreateFactionScores(factions: Record<string, FactionReputationScores>, factionPageId: string): FactionReputationScores;
export declare function buildProjectOutcomeTrustBump(factionPageId: string, description: string, currentTrust: number): {
    nextTrust: number;
    fromBand: string;
    toBand: string;
    direction: ReputationDirection;
};
export { CAMPAIGN_REPUTATION_SEMANTICS_VERSION };
//# sourceMappingURL=reputationSimulation.d.ts.map