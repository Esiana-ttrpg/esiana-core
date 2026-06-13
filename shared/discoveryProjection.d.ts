/**
 * Phase 23 — discovery projection contract.
 * Single shape for browse, search, links, inspector, and future surfaces.
 */
import { type ContentRevelationState } from './contentPresence.js';
import { type KnowledgeState, type LoreClaimRecord, type LoreInterpretationAccountRecord } from './loreKnowledge.js';
export declare const RevelationSourceTypes: {
    readonly SESSION: "SESSION";
    readonly MANUAL: "MANUAL";
    readonly IMPORT: "IMPORT";
    readonly QUEST: "QUEST";
    readonly SCENE: "SCENE";
    readonly RUMOR: "RUMOR";
};
export type RevelationSourceType = (typeof RevelationSourceTypes)[keyof typeof RevelationSourceTypes];
export type RevelationSource = {
    type: 'SESSION';
    sessionId: string;
} | {
    type: 'MANUAL';
} | {
    type: 'IMPORT';
} | {
    type: 'QUEST';
    questId?: string;
} | {
    type: 'SCENE';
    sceneId?: string;
} | {
    type: 'RUMOR';
    circulationId?: string;
};
export interface RevelationProvenance {
    discoveredAt: string | null;
    source: RevelationSource | null;
}
export declare const DiscoveryStates: {
    readonly HIDDEN: "hidden";
    readonly RUMOR: "rumor";
    readonly PARTIAL: "partial";
    readonly CONTESTED: "contested";
    readonly KNOWN: "known";
};
export type DiscoveryState = (typeof DiscoveryStates)[keyof typeof DiscoveryStates];
export interface DiscoveryStateProjection {
    state: DiscoveryState;
    available: boolean;
    gatedUntil?: number;
}
export interface DiscoveryProjection {
    isDiscovered: boolean;
    presenceState: ContentRevelationState;
    isManagerView: boolean;
    visibleChildCount?: number;
    undiscoveredCount?: number;
    visibleKnowledgeStates?: KnowledgeState[];
    revelation?: RevelationProvenance;
    discovery?: DiscoveryStateProjection;
}
export type PartyKnowledgeGroup = 'confirmed' | 'suspected' | 'disproven' | 'contested';
export type PartyKnowledgeGroups = Record<PartyKnowledgeGroup, LoreClaimRecord[]>;
export interface PartyKnowledgeProjection extends DiscoveryProjection {
    groups: PartyKnowledgeGroups;
    isContested: boolean;
    discovery: DiscoveryStateProjection;
}
export interface DiscoveryBrowseSummary {
    discoveredCount: number;
    undiscoveredCount: number;
    visibleChildCount: number;
}
export type ClaimRevelationInput = {
    discoveredAt?: Date | string | null;
    discoveredViaType?: string | null;
    discoveredViaSessionId?: string | null;
    discoveredViaRef?: string | null;
};
export type PresenceRevelationInput = {
    revealedAt?: Date | string | null;
    workflowKey?: string | null;
    reason?: string | null;
};
export declare function isEntityDiscovered(presenceState: ContentRevelationState, isManagerView: boolean): boolean;
export declare function resolvePresenceState(presenceMap: Map<string, ContentRevelationState>, entityId: string): ContentRevelationState;
export declare function projectPageDiscovery(pageId: string, presenceMap: Map<string, ContentRevelationState>, isManagerView: boolean, revelation?: RevelationProvenance): DiscoveryProjection;
export declare function partitionByDiscovery<T extends {
    id: string;
}>(items: T[], presenceMap: Map<string, ContentRevelationState>, isManagerView: boolean): {
    discovered: T[];
    undiscoveredCount: number;
};
export declare function projectBrowseSummary<T extends {
    id: string;
}>(items: T[], presenceMap: Map<string, ContentRevelationState>, isManagerView: boolean): DiscoveryBrowseSummary;
export declare function filterClaimsForPartyKnowledge(claims: LoreClaimRecord[], isManagerView: boolean): LoreClaimRecord[];
export declare function computeIsContested(claims: LoreClaimRecord[], interpretations?: LoreInterpretationAccountRecord[]): boolean;
export declare function computePartyKnowledgeGroups(claims: LoreClaimRecord[], interpretations?: LoreInterpretationAccountRecord[]): PartyKnowledgeGroups;
export declare function inferRevelationSource(input: {
    discoveredViaType?: string | null;
    discoveredViaSessionId?: string | null;
    discoveredViaRef?: string | null;
    workflowKey?: string | null;
    reason?: string | null;
}): RevelationSource | null;
export declare function serializeClaimRevelation(claim: ClaimRevelationInput): RevelationProvenance | null;
export declare function serializePresenceRevelation(presence: PresenceRevelationInput): RevelationProvenance | null;
export declare function emptyPartyKnowledgeGroups(): PartyKnowledgeGroups;
export declare function projectDiscoveryState(input: {
    presenceState: ContentRevelationState;
    availableFromEpochMinute?: number | null;
    campaignNowEpochMinute?: number | null;
    claims: LoreClaimRecord[];
    interpretations?: LoreInterpretationAccountRecord[];
    isManagerView: boolean;
}): DiscoveryStateProjection;
export declare function isDiscoveryAvailable(projection: DiscoveryStateProjection): boolean;
//# sourceMappingURL=discoveryProjection.d.ts.map