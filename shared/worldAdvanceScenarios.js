"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_ADVANCE_SCENARIOS = exports.SCENARIO_PAGE_PLACEHOLDERS = exports.WORLD_ADVANCE_SCENARIO_KEYS = void 0;
exports.getWorldAdvanceScenario = getWorldAdvanceScenario;
exports.buildScenarioPageTitles = buildScenarioPageTitles;
exports.buildScenarioBatchRequest = buildScenarioBatchRequest;
/**
 * Tier 1 — canonical world-advance validation scenarios (stable IDs, synthetic page keys).
 */
const worldAdvance_js_1 = require("./worldAdvance.js");
exports.WORLD_ADVANCE_SCENARIO_KEYS = [
    'war_escalation',
    'refugee_crisis',
    'failed_harvest',
    'noble_alliance',
    'trade_collapse',
    'harsh_winter',
];
/** Stable placeholder page IDs shared across scenarios (tests use these directly). */
exports.SCENARIO_PAGE_PLACEHOLDERS = {
    regionFrostMarch: 'page-region-frost-march',
    regionGreywatch: 'page-region-greywatch',
    regionHarvestVale: 'page-region-harvest-vale',
    regionRiverCorridor: 'page-region-river-corridor',
    regionNorthernReach: 'page-region-northern-reach',
    regionPeacefulShire: 'page-region-peaceful-shire',
    regionCapital: 'page-region-capital',
    regionDistantCoast: 'page-region-distant-coast',
    orgHouseValen: 'page-org-house-valen',
    orgRivalHouse: 'page-org-rival-house',
    orgHouseAldric: 'page-org-house-aldric',
    orgHouseCorwin: 'page-org-house-corwin',
    orgMerchantGuild: 'page-org-merchant-guild',
    npcRefugeeLeader: 'page-npc-refugee-leader',
    npcWinterTraveler: 'page-npc-winter-traveler',
};
const P = exports.SCENARIO_PAGE_PLACEHOLDERS;
exports.WORLD_ADVANCE_SCENARIOS = [
    {
        key: 'war_escalation',
        label: 'War escalation',
        primaryDomains: [
            worldAdvance_js_1.WorldAdvanceProjectionDomains.CONFLICT,
            worldAdvance_js_1.WorldAdvanceProjectionDomains.FACTION,
            worldAdvance_js_1.WorldAdvanceProjectionDomains.TERRITORIAL,
        ],
        pageKeys: {
            regionFrostMarch: P.regionFrostMarch,
            orgHouseValen: P.orgHouseValen,
            orgRivalHouse: P.orgRivalHouse,
            regionPeacefulShire: P.regionPeacefulShire,
        },
        pageTitles: {
            regionFrostMarch: 'Frost March',
            orgHouseValen: 'House Valen',
            orgRivalHouse: 'House Rivalen',
            regionPeacefulShire: 'Peaceful Shire',
        },
        effects: [
            {
                id: 'war_escalation:faction_hostile',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.FACTION,
                type: 'append_org_relation_event',
                orgPageId: P.orgHouseValen,
                targetOrgId: P.orgRivalHouse,
                relationType: 'RIVALRY',
                stance: 'HOSTILE',
                note: 'Open hostility declared',
            },
            {
                id: 'war_escalation:conflict_front',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.CONFLICT,
                type: 'conflict_front',
                label: 'Frost border clash',
                phase: 'escalating',
                regionPageIds: [P.regionFrostMarch],
                orgPageIds: [P.orgHouseValen, P.orgRivalHouse],
            },
            {
                id: 'war_escalation:territory_pressure',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.TERRITORIAL,
                type: 'territory_pressure',
                regionPageId: P.regionFrostMarch,
                orgPageId: P.orgHouseValen,
                pressureLevel: 'high',
                note: 'Border forts strained',
            },
        ],
        expectations: {
            positive: {
                axes: { military_pressure: 'rising', region_stability: 'unstable' },
                synthesisMustInclude: ['escalat', 'Frost March'],
            },
            antiGoals: {
                synthesisMustNotInclude: ['trade disruption', 'harvest'],
                domainsMustNotSurface: [worldAdvance_js_1.WorldAdvanceProjectionDomains.SEASONAL],
            },
            locality: {
                inScopePageKeys: ['regionFrostMarch', 'orgHouseValen', 'orgRivalHouse'],
                outOfScopePageKeys: ['regionPeacefulShire'],
            },
        },
    },
    {
        key: 'refugee_crisis',
        label: 'Refugee crisis',
        primaryDomains: [
            worldAdvance_js_1.WorldAdvanceProjectionDomains.NPC_MOBILITY,
            worldAdvance_js_1.WorldAdvanceProjectionDomains.CONFLICT,
        ],
        pageKeys: {
            regionGreywatch: P.regionGreywatch,
            npcRefugeeLeader: P.npcRefugeeLeader,
            regionCapital: P.regionCapital,
        },
        pageTitles: {
            regionGreywatch: 'Greywatch Crossing',
            npcRefugeeLeader: 'Mara the Displaced',
            regionCapital: 'Kingsport',
        },
        effects: [
            {
                id: 'refugee_crisis:displacement',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.NPC_MOBILITY,
                type: 'displacement',
                characterPageId: P.npcRefugeeLeader,
                fromLocationPageId: P.regionFrostMarch,
                toLocationPageId: P.regionGreywatch,
                note: 'Caravan of refugees',
            },
            {
                id: 'refugee_crisis:conflict_latent',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.CONFLICT,
                type: 'conflict_front',
                label: 'Greywatch strain',
                phase: 'latent',
                regionPageIds: [P.regionGreywatch],
            },
            {
                id: 'refugee_crisis:migration_travel',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.NPC_MOBILITY,
                type: 'append_location_event',
                characterPageId: P.npcRefugeeLeader,
                locationPageId: P.regionGreywatch,
                kind: 'travel',
                note: 'Mass movement toward crossing',
            },
        ],
        expectations: {
            positive: {
                axes: { migration_pressure: 'severe' },
                synthesisMustInclude: ['Greywatch', 'displacement'],
            },
            antiGoals: {
                axesMustNot: { military_pressure: ['critical'] },
                synthesisMustNotInclude: ['ally toward'],
            },
            locality: {
                inScopePageKeys: ['regionGreywatch', 'npcRefugeeLeader'],
                outOfScopePageKeys: ['regionCapital'],
            },
        },
    },
    {
        key: 'failed_harvest',
        label: 'Failed harvest',
        primaryDomains: [
            worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
            worldAdvance_js_1.WorldAdvanceProjectionDomains.SEASONAL,
        ],
        pageKeys: {
            regionHarvestVale: P.regionHarvestVale,
            regionCapital: P.regionCapital,
        },
        pageTitles: {
            regionHarvestVale: 'Harvest Vale',
            regionCapital: 'Kingsport',
        },
        effects: [
            {
                id: 'failed_harvest:scarcity',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
                type: 'economic_signal',
                targetKind: 'location',
                pageId: P.regionHarvestVale,
                signal: 'scarcity',
                note: 'Crop failure across the vale',
            },
            {
                id: 'failed_harvest:prosperity_decline',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
                type: 'economic_signal',
                targetKind: 'location',
                pageId: P.regionHarvestVale,
                signal: 'prosperity_decline',
            },
            {
                id: 'failed_harvest:season',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.SEASONAL,
                type: 'record_season_context',
                regionPageId: P.regionHarvestVale,
                note: 'Early frost ruined the second planting',
            },
        ],
        expectations: {
            positive: {
                axes: { prosperity: 'declining' },
                synthesisMustInclude: ['Harvest Vale', 'strain'],
            },
            antiGoals: {
                axesMustNot: { military_pressure: ['critical'] },
                synthesisMustNotInclude: ['war', 'escalat', 'displacement'],
                domainsMustNotSurface: [worldAdvance_js_1.WorldAdvanceProjectionDomains.CONFLICT],
            },
            locality: {
                inScopePageKeys: ['regionHarvestVale'],
                outOfScopePageKeys: ['regionCapital'],
            },
        },
    },
    {
        key: 'noble_alliance',
        label: 'Noble alliance',
        primaryDomains: [worldAdvance_js_1.WorldAdvanceProjectionDomains.FACTION],
        pageKeys: {
            orgHouseAldric: P.orgHouseAldric,
            orgHouseCorwin: P.orgHouseCorwin,
            regionPeacefulShire: P.regionPeacefulShire,
        },
        pageTitles: {
            orgHouseAldric: 'House Aldric',
            orgHouseCorwin: 'House Corwin',
            regionPeacefulShire: 'Peaceful Shire',
        },
        effects: [
            {
                id: 'noble_alliance:diplomatic',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.FACTION,
                type: 'append_org_relation_event',
                orgPageId: P.orgHouseAldric,
                targetOrgId: P.orgHouseCorwin,
                relationType: 'ALLIANCE',
                stance: 'ALLY',
                note: 'Marriage pact sealed',
            },
            {
                id: 'noble_alliance:diplomatic_reverse',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.FACTION,
                type: 'append_org_relation_event',
                orgPageId: P.orgHouseCorwin,
                targetOrgId: P.orgHouseAldric,
                relationType: 'DIPLOMATIC',
                stance: 'ALLY',
            },
        ],
        expectations: {
            positive: {
                synthesisMustInclude: ['ally', 'House Aldric'],
            },
            antiGoals: {
                axesMustNot: { migration_pressure: ['severe'] },
                synthesisMustNotInclude: ['escalat', 'critical', 'displacement'],
            },
            locality: {
                inScopePageKeys: ['orgHouseAldric', 'orgHouseCorwin'],
                outOfScopePageKeys: ['regionPeacefulShire'],
            },
        },
    },
    {
        key: 'trade_collapse',
        label: 'Trade collapse',
        primaryDomains: [worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC],
        pageKeys: {
            regionRiverCorridor: P.regionRiverCorridor,
            orgMerchantGuild: P.orgMerchantGuild,
            regionCapital: P.regionCapital,
            regionDistantCoast: P.regionDistantCoast,
        },
        pageTitles: {
            regionRiverCorridor: 'River Corridor',
            orgMerchantGuild: 'Merchant Guild of the Flow',
            regionCapital: 'Kingsport',
            regionDistantCoast: 'Distant Coast',
        },
        effects: [
            {
                id: 'trade_collapse:disruption',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
                type: 'economic_signal',
                targetKind: 'location',
                pageId: P.regionRiverCorridor,
                signal: 'trade_disruption',
                note: 'Tolls and banditry on the river road',
            },
            {
                id: 'trade_collapse:guild_decline',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
                type: 'economic_signal',
                targetKind: 'org',
                pageId: P.orgMerchantGuild,
                signal: 'prosperity_decline',
            },
        ],
        expectations: {
            positive: {
                axes: { prosperity: 'declining' },
                synthesisMustInclude: ['Trade disruption', 'River Corridor'],
            },
            antiGoals: {
                axesMustNot: {
                    military_pressure: ['critical', 'rising'],
                    region_stability: ['unstable'],
                },
                synthesisMustNotInclude: ['escalat', 'HOSTILE'],
            },
            locality: {
                inScopePageKeys: ['regionRiverCorridor', 'orgMerchantGuild'],
                outOfScopePageKeys: ['regionCapital', 'regionDistantCoast'],
            },
        },
    },
    {
        key: 'harsh_winter',
        label: 'Harsh winter',
        primaryDomains: [
            worldAdvance_js_1.WorldAdvanceProjectionDomains.SEASONAL,
            worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
            worldAdvance_js_1.WorldAdvanceProjectionDomains.NPC_MOBILITY,
        ],
        pageKeys: {
            regionNorthernReach: P.regionNorthernReach,
            npcWinterTraveler: P.npcWinterTraveler,
            regionPeacefulShire: P.regionPeacefulShire,
        },
        pageTitles: {
            regionNorthernReach: 'Northern Reach',
            npcWinterTraveler: 'Edda Snowbound',
            regionPeacefulShire: 'Peaceful Shire',
        },
        effects: [
            {
                id: 'harsh_winter:season',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.SEASONAL,
                type: 'record_season_context',
                regionPageId: P.regionNorthernReach,
                note: 'Blizzards block mountain passes',
            },
            {
                id: 'harsh_winter:scarcity',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.ECONOMIC,
                type: 'economic_signal',
                targetKind: 'location',
                pageId: P.regionNorthernReach,
                signal: 'scarcity',
            },
            {
                id: 'harsh_winter:displacement',
                domain: worldAdvance_js_1.WorldAdvanceProjectionDomains.NPC_MOBILITY,
                type: 'displacement',
                characterPageId: P.npcWinterTraveler,
                fromLocationPageId: P.regionNorthernReach,
                toLocationPageId: P.regionNorthernReach,
                note: 'Villages cut off, internal displacement',
            },
        ],
        expectations: {
            positive: {
                synthesisMustInclude: ['Northern Reach'],
            },
            antiGoals: {
                axesMustNot: { region_stability: ['unstable'] },
                synthesisMustNotInclude: ['escalat', 'HOSTILE'],
            },
            locality: {
                inScopePageKeys: ['regionNorthernReach', 'npcWinterTraveler'],
                outOfScopePageKeys: ['regionPeacefulShire'],
            },
        },
    },
];
function getWorldAdvanceScenario(key) {
    const scenario = exports.WORLD_ADVANCE_SCENARIOS.find((s) => s.key === key);
    if (!scenario)
        throw new Error(`Unknown world advance scenario: ${key}`);
    return scenario;
}
function buildScenarioPageTitles(scenario) {
    const titles = new Map();
    for (const [role, pageId] of Object.entries(scenario.pageKeys)) {
        titles.set(pageId, scenario.pageTitles[role] ?? role);
    }
    return titles;
}
function buildScenarioBatchRequest(scenario) {
    return {
        effects: scenario.effects,
        note: `Validation scenario: ${scenario.key}`,
        batchIdempotencyKey: `validation-${scenario.key}`,
    };
}
//# sourceMappingURL=worldAdvanceScenarios.js.map