"use strict";
/**
 * Layer 1 — party-to-faction reputation contracts (browser-safe).
 * Distinct from org-to-org diplomatic relations and adventure investigation ledger.
 * @see docs/platform/downtime-reputation.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPUTATION_NARRATIVE_MAX_LENGTH = exports.REPUTATION_SOURCE_TYPES = exports.REPUTATION_DIRECTIONS = exports.REPUTATION_SUGGESTION_STATUSES = exports.REPUTATION_SUGGESTION_KINDS = exports.REPUTATION_EVENT_KINDS = exports.REPUTATION_AXES = exports.CAMPAIGN_REPUTATION_SEMANTICS_VERSION = void 0;
exports.normalizeReputationAxis = normalizeReputationAxis;
exports.normalizeReputationEventKind = normalizeReputationEventKind;
exports.normalizeReputationSuggestionKind = normalizeReputationSuggestionKind;
exports.normalizeReputationSuggestionStatus = normalizeReputationSuggestionStatus;
exports.normalizeReputationDirection = normalizeReputationDirection;
exports.normalizeReputationSourceType = normalizeReputationSourceType;
exports.normalizeReputationNarrative = normalizeReputationNarrative;
exports.clampReputationScore = clampReputationScore;
exports.defaultFactionReputationScores = defaultFactionReputationScores;
exports.emptyCampaignReputationState = emptyCampaignReputationState;
exports.parseCampaignReputationState = parseCampaignReputationState;
exports.serializeCampaignReputationState = serializeCampaignReputationState;
exports.formatReputationDirectionArrow = formatReputationDirectionArrow;
exports.CAMPAIGN_REPUTATION_SEMANTICS_VERSION = 'campaign-reputation-v1';
exports.REPUTATION_AXES = ['trust', 'notoriety'];
exports.REPUTATION_EVENT_KINDS = [
    'drift',
    'band_crossing',
    'investigation',
    'rumor_spread',
    'project_outcome',
];
exports.REPUTATION_SUGGESTION_KINDS = [
    'band_crossing',
    'investigation',
    'rumor_spread',
];
exports.REPUTATION_SUGGESTION_STATUSES = [
    'pending',
    'accepted',
    'dismissed',
];
exports.REPUTATION_DIRECTIONS = ['up', 'down', 'flat'];
exports.REPUTATION_SOURCE_TYPES = [
    'time_hook',
    'project_outcome',
    'haven_activity',
    'rumor_pressure',
    'creative_drift',
    'other',
];
exports.REPUTATION_NARRATIVE_MAX_LENGTH = 200;
function normalizeReputationAxis(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    return exports.REPUTATION_AXES.find((axis) => axis === lower) ?? null;
}
function normalizeReputationEventKind(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    return exports.REPUTATION_EVENT_KINDS.find((kind) => kind === lower) ?? null;
}
function normalizeReputationSuggestionKind(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    return exports.REPUTATION_SUGGESTION_KINDS.find((kind) => kind === lower) ?? null;
}
function normalizeReputationSuggestionStatus(raw) {
    if (typeof raw !== 'string')
        return 'pending';
    const lower = raw.trim().toLowerCase();
    return (exports.REPUTATION_SUGGESTION_STATUSES.find((status) => status === lower) ?? 'pending');
}
function normalizeReputationDirection(raw) {
    if (typeof raw !== 'string')
        return 'flat';
    const lower = raw.trim().toLowerCase();
    return exports.REPUTATION_DIRECTIONS.find((direction) => direction === lower) ?? 'flat';
}
function normalizeReputationSourceType(raw) {
    if (typeof raw !== 'string')
        return 'other';
    const lower = raw.trim().toLowerCase();
    return exports.REPUTATION_SOURCE_TYPES.find((type) => type === lower) ?? 'other';
}
function normalizeReputationNarrative(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    return trimmed.slice(0, exports.REPUTATION_NARRATIVE_MAX_LENGTH);
}
function clampReputationScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}
function defaultFactionReputationScores() {
    return {
        trust: 50,
        notoriety: 50,
        lastSimulatedAtEpochMinute: null,
    };
}
function emptyCampaignReputationState() {
    return {
        version: exports.CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
        factions: {},
    };
}
function normalizeFactionScores(raw) {
    const defaults = defaultFactionReputationScores();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return defaults;
    const record = raw;
    const trust = typeof record.trust === 'number' && Number.isFinite(record.trust)
        ? clampReputationScore(record.trust)
        : defaults.trust;
    const notoriety = typeof record.notoriety === 'number' && Number.isFinite(record.notoriety)
        ? clampReputationScore(record.notoriety)
        : defaults.notoriety;
    const lastSimulatedAtEpochMinute = typeof record.lastSimulatedAtEpochMinute === 'string'
        ? record.lastSimulatedAtEpochMinute
        : null;
    return { trust, notoriety, lastSimulatedAtEpochMinute };
}
function parseCampaignReputationState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return emptyCampaignReputationState();
    }
    const record = raw;
    const factionsRaw = record.factions;
    const factions = {};
    if (factionsRaw && typeof factionsRaw === 'object' && !Array.isArray(factionsRaw)) {
        for (const [factionPageId, scores] of Object.entries(factionsRaw)) {
            if (!factionPageId.trim())
                continue;
            factions[factionPageId] = normalizeFactionScores(scores);
        }
    }
    return {
        version: exports.CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
        factions,
    };
}
function serializeCampaignReputationState(state) {
    return {
        version: state.version,
        factions: { ...state.factions },
    };
}
function formatReputationDirectionArrow(direction) {
    switch (direction) {
        case 'up':
            return '↑';
        case 'down':
            return '↓';
        default:
            return '→';
    }
}
//# sourceMappingURL=reputationMetadata.js.map