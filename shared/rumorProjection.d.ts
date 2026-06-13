import type { LoreClaimRecord, LoreClaimSourceRecord, LoreInterpretationAccountRecord } from './loreKnowledge.js';
import { type EpochMinuteString, type FactionProjectionScope, type RegionProjectionScope, type RumorCirculationRecord, type RumorFeedProjection, type RumorProjectionContext } from './rumorEngine.js';
export type RumorProjectionInput = {
    ctx: RumorProjectionContext;
    scope: RegionProjectionScope | FactionProjectionScope;
    scopeMode: 'region' | 'faction';
    circulations: RumorCirculationRecord[];
    claims: LoreClaimRecord[];
    claimSources: LoreClaimSourceRecord[];
    interpretations: LoreInterpretationAccountRecord[];
    /** claimId -> interpretation group id */
    claimGroupIds?: Map<string, string | null>;
};
/** Edges at or before asOf; retractions remove superseded circulation ids. */
export declare function computeActiveCirculations(circulations: RumorCirculationRecord[], asOfEpochMinute: EpochMinuteString): RumorCirculationRecord[];
/** Party invariant: filter PARTY visibility before dedupe. */
export declare function filterCirculationsForAudience(circulations: RumorCirculationRecord[], isElevated: boolean): RumorCirculationRecord[];
export declare function assembleRumorFeed(input: RumorProjectionInput): RumorFeedProjection;
export declare function assembleRegionRumorFeed(input: Omit<RumorProjectionInput, 'scopeMode'> & {
    scope: RegionProjectionScope;
}): RumorFeedProjection;
export declare function assembleFactionGossipFeed(input: Omit<RumorProjectionInput, 'scopeMode'> & {
    scope: FactionProjectionScope;
}): RumorFeedProjection;
//# sourceMappingURL=rumorProjection.d.ts.map