"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InclusionReasonRanks = exports.CirculationVisibilities = exports.CirculationTargetKinds = exports.CirculationEdgeKinds = exports.AwarenessScopes = exports.RumorStances = exports.RUMOR_ENGINE_VERSION = void 0;
exports.compareEpochMinutes = compareEpochMinutes;
exports.isEpochAtOrBefore = isEpochAtOrBefore;
exports.inferAwarenessScopeForTarget = inferAwarenessScopeForTarget;
exports.normalizeRumorStance = normalizeRumorStance;
exports.normalizeAwarenessScope = normalizeAwarenessScope;
exports.normalizeCirculationVisibility = normalizeCirculationVisibility;
exports.RUMOR_ENGINE_VERSION = 'rumor-engine-v1';
exports.RumorStances = {
    ASSERTS: 'asserts',
    DENIES: 'denies',
    DISTORTS: 'distorts',
    MYTHOLOGIZES: 'mythologizes',
    SATIRIZES: 'satirizes',
};
exports.AwarenessScopes = {
    LOCAL: 'local',
    REGIONAL: 'regional',
    FACTIONAL: 'factional',
    GLOBAL: 'global',
};
exports.CirculationEdgeKinds = {
    CIRCULATION: 'circulation',
    RETRACTION: 'retraction',
};
exports.CirculationTargetKinds = {
    REGION: 'region',
    FACTION: 'faction',
};
exports.CirculationVisibilities = {
    PARTY: 'PARTY',
    GM_ONLY: 'GM_ONLY',
};
exports.InclusionReasonRanks = {
    SUBJECT_LOCALITY: 1,
    SOURCE_LOCALITY: 2,
    EXPLICIT_SPREAD: 3,
    INTERPRETATION_REGION: 4,
    ORG_GRAPH: 5,
};
function compareEpochMinutes(a, b) {
    const ba = BigInt(a);
    const bb = BigInt(b);
    if (ba < bb)
        return -1;
    if (ba > bb)
        return 1;
    return 0;
}
function isEpochAtOrBefore(epoch, asOf) {
    return compareEpochMinutes(epoch, asOf) <= 0;
}
function inferAwarenessScopeForTarget(targetKind, override) {
    if (override)
        return override;
    return targetKind === exports.CirculationTargetKinds.FACTION
        ? exports.AwarenessScopes.FACTIONAL
        : exports.AwarenessScopes.REGIONAL;
}
function normalizeRumorStance(raw) {
    const v = raw?.trim().toLowerCase();
    const values = Object.values(exports.RumorStances);
    if (v && values.includes(v))
        return v;
    return exports.RumorStances.ASSERTS;
}
function normalizeAwarenessScope(raw) {
    const v = raw?.trim().toLowerCase();
    const values = Object.values(exports.AwarenessScopes);
    if (v && values.includes(v))
        return v;
    return exports.AwarenessScopes.REGIONAL;
}
function normalizeCirculationVisibility(raw) {
    return raw?.trim().toUpperCase() === exports.CirculationVisibilities.PARTY
        ? exports.CirculationVisibilities.PARTY
        : exports.CirculationVisibilities.GM_ONLY;
}
//# sourceMappingURL=rumorEngine.js.map