"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOMENTUM_TO_TREND_DIRECTION = exports.WORLD_EVENT_NARRATIVE_MAX_LENGTH = exports.WORLD_EVENT_SUGGESTION_SOURCE_TYPES = exports.WORLD_EVENT_SUGGESTION_KINDS = exports.WORLD_EVENT_SUGGESTION_STATUSES = exports.RECENT_SIMILAR_SUGGESTION_WINDOW_MINUTES = exports.WORLD_PRESSURE_EVENT_METADATA_VERSION = exports.WORLD_EVENT_SUGGESTION_SEMANTICS_VERSION = void 0;
exports.normalizeWorldEventSuggestionStatus = normalizeWorldEventSuggestionStatus;
exports.normalizeWorldEventSuggestionKind = normalizeWorldEventSuggestionKind;
exports.normalizeWorldEventSuggestionSourceType = normalizeWorldEventSuggestionSourceType;
exports.normalizeWorldEventNarrative = normalizeWorldEventNarrative;
exports.isEligibleAdvanceMagnitudeForPrompts = isEligibleAdvanceMagnitudeForPrompts;
exports.deriveWorldEventPromptCandidates = deriveWorldEventPromptCandidates;
exports.buildWorldPressureEventMetadata = buildWorldPressureEventMetadata;
exports.formatWorldEventSuggestionKindLabel = formatWorldEventSuggestionKindLabel;
exports.formatMomentumStateLabel = formatMomentumStateLabel;
const factionMomentumMetadata_js_1 = require("./factionMomentumMetadata.js");
exports.WORLD_EVENT_SUGGESTION_SEMANTICS_VERSION = 'world-event-suggestion-v1';
exports.WORLD_PRESSURE_EVENT_METADATA_VERSION = 'world-pressure-event-v1';
exports.RECENT_SIMILAR_SUGGESTION_WINDOW_MINUTES = 14 * 24 * 60; // 14 days
exports.WORLD_EVENT_SUGGESTION_STATUSES = ['pending', 'accepted', 'dismissed'];
exports.WORLD_EVENT_SUGGESTION_KINDS = ['faction_pressure', 'era_trend'];
exports.WORLD_EVENT_SUGGESTION_SOURCE_TYPES = ['time_hook', 'other'];
exports.WORLD_EVENT_NARRATIVE_MAX_LENGTH = 500;
exports.MOMENTUM_TO_TREND_DIRECTION = {
    rising: 'growth',
    expanding: 'growth',
    resurgent: 'growth',
    declining: 'decline',
    dormant: 'decline',
    fragmenting: 'destabilizing',
    desperate: 'destabilizing',
    stable: null,
};
function normalizeWorldEventSuggestionStatus(raw) {
    if (typeof raw !== 'string')
        return 'pending';
    const lower = raw.trim().toLowerCase();
    return exports.WORLD_EVENT_SUGGESTION_STATUSES.find((s) => s === lower) ?? 'pending';
}
function normalizeWorldEventSuggestionKind(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    return exports.WORLD_EVENT_SUGGESTION_KINDS.find((k) => k === lower) ?? null;
}
function normalizeWorldEventSuggestionSourceType(raw) {
    if (typeof raw !== 'string')
        return 'other';
    const lower = raw.trim().toLowerCase();
    return exports.WORLD_EVENT_SUGGESTION_SOURCE_TYPES.find((t) => t === lower) ?? 'other';
}
function normalizeWorldEventNarrative(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    return trimmed.slice(0, exports.WORLD_EVENT_NARRATIVE_MAX_LENGTH);
}
function isEligibleAdvanceMagnitudeForPrompts(magnitude) {
    return magnitude === 'medium' || magnitude === 'large' || magnitude === 'massive';
}
function factionPromptTitle(line) {
    const label = line.momentumLabel;
    return `${line.orgTitle} — ${label}`;
}
function factionIdempotencyKey(nextEpochMinute, orgPageId, momentumState) {
    return `world-pressure:${nextEpochMinute}:${orgPageId}:${momentumState}`;
}
function eraTrendIdempotencyKey(nextEpochMinute, eraId, trendDirection) {
    return `world-pressure:${nextEpochMinute}:era-trend:${eraId}:${trendDirection}`;
}
function dominantTrendDirection(lines) {
    const counts = {
        growth: 0,
        decline: 0,
        destabilizing: 0,
    };
    for (const line of lines) {
        const state = line.momentumState;
        if (!state)
            continue;
        const direction = exports.MOMENTUM_TO_TREND_DIRECTION[state];
        if (direction)
            counts[direction] += 1;
    }
    let best = null;
    let bestCount = 0;
    for (const [direction, count] of Object.entries(counts)) {
        if (count >= 2 && count > bestCount) {
            best = direction;
            bestCount = count;
        }
    }
    return best;
}
const ERA_TREND_TITLES = {
    growth: 'Expansion across multiple factions',
    decline: 'Waning influence across the region',
    destabilizing: 'Instability spreading between factions',
};
function deriveWorldEventPromptCandidates(projection, context) {
    if (!isEligibleAdvanceMagnitudeForPrompts(context.advanceMagnitude)) {
        return [];
    }
    const drafts = [];
    const eraId = projection.currentEra.id;
    for (const line of projection.risingTensions.slice(0, 2)) {
        const momentumState = line.momentumState;
        if (!momentumState)
            continue;
        const narrative = line.bullets[0] ?? null;
        drafts.push({
            kind: 'faction_pressure',
            title: factionPromptTitle(line),
            narrative,
            idempotencyKey: factionIdempotencyKey(context.nextEpochMinute, line.orgPageId, momentumState),
            primaryOrgPageId: line.orgPageId,
            eraId,
            momentumState,
            trendDirection: exports.MOMENTUM_TO_TREND_DIRECTION[momentumState],
        });
    }
    const trendDirection = dominantTrendDirection(projection.risingTensions);
    if (trendDirection && projection.eraTrends.length > 0) {
        drafts.push({
            kind: 'era_trend',
            title: ERA_TREND_TITLES[trendDirection],
            narrative: projection.eraTrends[0] ?? null,
            idempotencyKey: eraTrendIdempotencyKey(context.nextEpochMinute, eraId, trendDirection),
            primaryOrgPageId: null,
            eraId,
            momentumState: null,
            trendDirection,
        });
    }
    return drafts;
}
function buildWorldPressureEventMetadata(input) {
    return {
        version: exports.WORLD_PRESSURE_EVENT_METADATA_VERSION,
        source: 'world_pressure',
        suggestionId: input.suggestionId,
        hookVersion: input.hookVersion,
        projectionEpoch: input.projectionEpoch,
        primaryOrgPageId: input.primaryOrgPageId ?? null,
        eraId: input.eraId ?? null,
        momentumState: input.momentumState ?? null,
        trendDirection: input.trendDirection ?? null,
    };
}
function formatWorldEventSuggestionKindLabel(kind) {
    if (kind === 'faction_pressure')
        return 'Faction development';
    return 'Regional shift';
}
function formatMomentumStateLabel(state) {
    if (!state)
        return null;
    const key = state;
    return factionMomentumMetadata_js_1.FACTION_MOMENTUM_STATE_LABELS[key] ?? state;
}
//# sourceMappingURL=worldEventSuggestionMetadata.js.map