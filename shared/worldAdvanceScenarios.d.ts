/**
 * Tier 1 — canonical world-advance validation scenarios (stable IDs, synthetic page keys).
 */
import { type WorldAdvanceEffect, type WorldAdvanceBatchRequest } from './worldAdvance.js';
import type { WorldConditionAxis, WorldConditionLevel } from './worldConditionSurfaces.js';
import type { WorldAdvanceProjectionDomain } from './worldAdvance.js';
export declare const WORLD_ADVANCE_SCENARIO_KEYS: readonly ["war_escalation", "refugee_crisis", "failed_harvest", "noble_alliance", "trade_collapse", "harsh_winter"];
export type WorldAdvanceScenarioKey = (typeof WORLD_ADVANCE_SCENARIO_KEYS)[number];
export type ScenarioExpectations = {
    positive: {
        axes?: Partial<Record<WorldConditionAxis, WorldConditionLevel>>;
        synthesisMustInclude?: string[];
    };
    antiGoals: {
        axesMustNot?: Partial<Record<WorldConditionAxis, WorldConditionLevel[]>>;
        synthesisMustNotInclude?: string[];
        domainsMustNotSurface?: WorldAdvanceProjectionDomain[];
    };
    locality: {
        inScopePageKeys: string[];
        outOfScopePageKeys: string[];
    };
};
export type WorldAdvanceScenario = {
    key: WorldAdvanceScenarioKey;
    label: string;
    primaryDomains: WorldAdvanceProjectionDomain[];
    pageKeys: Record<string, string>;
    pageTitles: Record<string, string>;
    effects: WorldAdvanceEffect[];
    expectations: ScenarioExpectations;
};
/** Stable placeholder page IDs shared across scenarios (tests use these directly). */
export declare const SCENARIO_PAGE_PLACEHOLDERS: {
    readonly regionFrostMarch: "page-region-frost-march";
    readonly regionGreywatch: "page-region-greywatch";
    readonly regionHarvestVale: "page-region-harvest-vale";
    readonly regionRiverCorridor: "page-region-river-corridor";
    readonly regionNorthernReach: "page-region-northern-reach";
    readonly regionPeacefulShire: "page-region-peaceful-shire";
    readonly regionCapital: "page-region-capital";
    readonly regionDistantCoast: "page-region-distant-coast";
    readonly orgHouseValen: "page-org-house-valen";
    readonly orgRivalHouse: "page-org-rival-house";
    readonly orgHouseAldric: "page-org-house-aldric";
    readonly orgHouseCorwin: "page-org-house-corwin";
    readonly orgMerchantGuild: "page-org-merchant-guild";
    readonly npcRefugeeLeader: "page-npc-refugee-leader";
    readonly npcWinterTraveler: "page-npc-winter-traveler";
};
export declare const WORLD_ADVANCE_SCENARIOS: WorldAdvanceScenario[];
export declare function getWorldAdvanceScenario(key: WorldAdvanceScenarioKey): WorldAdvanceScenario;
export declare function buildScenarioPageTitles(scenario: WorldAdvanceScenario): Map<string, string>;
export declare function buildScenarioBatchRequest(scenario: WorldAdvanceScenario): WorldAdvanceBatchRequest;
//# sourceMappingURL=worldAdvanceScenarios.d.ts.map