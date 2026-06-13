/**
 * Phase 22 — interpretive lore overlays (historical aliases, interpretations, claims).
 * Canonical prose lives on WikiPage; these types are structured knowledge graph nodes.
 */
import type { RevelationProvenance } from './discoveryProjection.js';
import { type ChronologyDateParts, compareChronologyDateParts, dateSortKey } from './chronologyTypes.js';
export type { ChronologyDateParts };
export declare const AliasUsageTypes: {
    readonly OFFICIAL: "OFFICIAL";
    readonly COLLOQUIAL: "COLLOQUIAL";
    readonly PEJORATIVE: "PEJORATIVE";
    readonly RELIGIOUS: "RELIGIOUS";
    readonly FOREIGN_LANGUAGE: "FOREIGN_LANGUAGE";
    readonly SECRET: "SECRET";
    readonly MYTHIC: "MYTHIC";
};
export type AliasUsageType = (typeof AliasUsageTypes)[keyof typeof AliasUsageTypes];
export declare const LoreSourceTypes: {
    readonly JOURNAL: "JOURNAL";
    readonly NPC_TESTIMONY: "NPC_TESTIMONY";
    readonly EVENT_RECORD: "EVENT_RECORD";
    readonly ARTIFACT: "ARTIFACT";
    readonly RUMOR: "RUMOR";
    readonly DIVINE_VISION: "DIVINE_VISION";
    readonly OTHER: "OTHER";
};
export type LoreSourceType = (typeof LoreSourceTypes)[keyof typeof LoreSourceTypes];
export declare const LoreAccountKinds: {
    readonly WIDELY_ACCEPTED: "WIDELY_ACCEPTED";
    readonly REGIONAL_BELIEF: "REGIONAL_BELIEF";
    readonly MYTHIC_TRADITION: "MYTHIC_TRADITION";
    readonly SUPPRESSED: "SUPPRESSED";
    readonly PROPAGANDA: "PROPAGANDA";
    readonly UNVERIFIED: "UNVERIFIED";
};
export type LoreAccountKind = (typeof LoreAccountKinds)[keyof typeof LoreAccountKinds];
export declare const LoreConfidences: {
    readonly VERIFIED: "VERIFIED";
    readonly PARTIAL: "PARTIAL";
    readonly UNVERIFIED: "UNVERIFIED";
    readonly CONTESTED: "CONTESTED";
};
export type LoreConfidence = (typeof LoreConfidences)[keyof typeof LoreConfidences];
export declare const ClaimSourceRoles: {
    readonly SUPPORTS: "SUPPORTS";
    readonly CONTRADICTS: "CONTRADICTS";
    readonly REFERENCES: "REFERENCES";
};
export type ClaimSourceRole = (typeof ClaimSourceRoles)[keyof typeof ClaimSourceRoles];
export declare const NarrativeWeights: {
    readonly MINOR: "MINOR";
    readonly MAJOR: "MAJOR";
    readonly FOUNDATIONAL: "FOUNDATIONAL";
    readonly APOCRYPHAL: "APOCRYPHAL";
};
export type NarrativeWeight = (typeof NarrativeWeights)[keyof typeof NarrativeWeights];
export declare const KnowledgeStates: {
    readonly KNOWN: "KNOWN";
    readonly SUSPECTED: "SUSPECTED";
    readonly CONFIRMED: "CONFIRMED";
    readonly DISPROVEN: "DISPROVEN";
    readonly UNDISCOVERED: "UNDISCOVERED";
};
export type KnowledgeState = (typeof KnowledgeStates)[keyof typeof KnowledgeStates];
export declare const LoreSourceEntityTypes: {
    readonly WIKI_PAGE: "WIKI_PAGE";
    readonly CALENDAR_EVENT: "CALENDAR_EVENT";
    readonly CHARACTER: "CHARACTER";
    readonly ARTIFACT: "ARTIFACT";
    readonly ORGANIZATION: "ORGANIZATION";
    readonly SESSION_NOTE: "SESSION_NOTE";
    readonly OTHER: "OTHER";
};
export type LoreSourceEntityType = (typeof LoreSourceEntityTypes)[keyof typeof LoreSourceEntityTypes];
export declare const LoreRelationVisibilities: {
    readonly PUBLIC: "PUBLIC";
    readonly PARTY: "PARTY";
    readonly GM_ONLY: "GM_ONLY";
    readonly SECRET: "SECRET";
};
export type LoreRelationVisibility = (typeof LoreRelationVisibilities)[keyof typeof LoreRelationVisibilities];
export type EntityHistoricalAliasRecord = {
    id: string;
    stableKey: string;
    pageId: string;
    campaignId: string;
    name: string;
    label?: string | null;
    context?: string | null;
    usageType: AliasUsageType;
    eraStart?: ChronologyDateParts | null;
    eraEnd?: ChronologyDateParts | null;
    regions?: string[];
    visibility: LoreRelationVisibility;
    isPrimaryInEra: boolean;
    isSecret: boolean;
    playerDiscoverable: boolean;
    sortOrder: number;
};
export type LoreInterpretationGroupRecord = {
    id: string;
    pageId: string;
    campaignId: string;
    topic?: string | null;
    sortOrder: number;
};
export type LoreInterpretationAccountRecord = {
    id: string;
    stableKey: string;
    pageId: string;
    campaignId: string;
    interpretationGroupId?: string | null;
    title: string;
    narrative: string;
    accountKind: LoreAccountKind;
    beliefRegion?: string | null;
    sourceOrigin?: string | null;
    confidence: LoreConfidence;
    visibility: LoreRelationVisibility;
    narrativeWeight?: NarrativeWeight | null;
    gmResolution?: string | null;
    sortOrder: number;
};
export type LoreClaimRecord = {
    id: string;
    stableKey: string;
    pageId: string;
    campaignId: string;
    statement: string;
    interpretationGroupId?: string | null;
    confidence: LoreConfidence;
    visibility: LoreRelationVisibility;
    narrativeWeight?: NarrativeWeight | null;
    gmResolution?: string | null;
    knowledgeState?: KnowledgeState | null;
    discoveredViaSessionId?: string | null;
    discoveredViaType?: string | null;
    discoveredViaRef?: string | null;
    discoveredAt?: string | null;
    revelation?: RevelationProvenance | null;
    sortOrder: number;
};
export type LoreClaimSourceRecord = {
    id: string;
    claimId: string;
    role: ClaimSourceRole;
    sourceType: LoreSourceType;
    sourceEntityType?: LoreSourceEntityType | null;
    sourceEntityId?: string | null;
    label?: string | null;
    note?: string | null;
    visibility: LoreRelationVisibility;
};
export type EraNameEntry = {
    name: string;
    usageType: AliasUsageType;
    label?: string | null;
};
export type EntityHistoricalNameProjection = {
    canonicalTitle: string;
    formerChip?: string | null;
    eraCallout?: EraNameEntry[] | null;
};
export type InterpretiveLoreSummary = {
    formerChip?: string | null;
    disputed?: boolean;
    isContested?: boolean;
    confidenceLabel?: string | null;
    partialVerification?: boolean;
};
export { dateSortKey, compareChronologyDateParts };
export declare function isDateWithinRange(date: ChronologyDateParts, start: ChronologyDateParts | null | undefined, end: ChronologyDateParts | null | undefined): boolean;
export declare function resolveHistoricalAliasesAtDate(aliases: readonly EntityHistoricalAliasRecord[], date: ChronologyDateParts): EntityHistoricalAliasRecord[];
export declare function resolveFormerPrimaryChip(aliases: readonly EntityHistoricalAliasRecord[], date: ChronologyDateParts, canonicalTitle: string): string | null;
export declare function buildEntityHistoricalNameProjection(canonicalTitle: string, aliases: readonly EntityHistoricalAliasRecord[], date: ChronologyDateParts): EntityHistoricalNameProjection;
export declare function formatAliasUsageTypeLabel(usageType: AliasUsageType): string;
export declare function formatLoreAccountKindLabel(kind: LoreAccountKind): string;
//# sourceMappingURL=loreKnowledge.d.ts.map