"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPresenceEntityType = exports.ContentRevelationStates = void 0;
exports.resolveContentPresenceState = resolveContentPresenceState;
exports.evaluateContentPresence = evaluateContentPresence;
/**
 * Cross-system content presence contracts (Phase 9 fog engine).
 * Canonical source: ContentPresenceState records with optional sub-entity overrides.
 */
const mapPresence_js_1 = require("./mapPresence.js");
Object.defineProperty(exports, "ContentRevelationStates", { enumerable: true, get: function () { return mapPresence_js_1.MapRevelationStates; } });
exports.ContentPresenceEntityType = {
    WIKI_PAGE: 'wiki_page',
    WIKI_BLOCK: 'wiki_block',
    TIMELINE_EVENT: 'timeline_event',
    SESSION_NOTE: 'session_note',
    MAP_OBJECT: 'map_object',
    SEARCH_RESULT: 'search_result',
    HISTORICAL_ALIAS: 'historical_alias',
    LORE_INTERPRETATION: 'lore_interpretation',
    LORE_CLAIM: 'lore_claim',
};
/** Precedence: sub-entity override > entity-level state > default (revealed). */
function resolveContentPresenceState(records, defaultState = mapPresence_js_1.MapRevelationStates.REVEALED) {
    if (records.length === 0)
        return defaultState;
    const state = records[0]?.state;
    if (state === mapPresence_js_1.MapRevelationStates.REVEALED ||
        state === mapPresence_js_1.MapRevelationStates.HIDDEN ||
        state === mapPresence_js_1.MapRevelationStates.DRAFT) {
        return state;
    }
    return defaultState;
}
function evaluateContentPresence(state) {
    if (state === mapPresence_js_1.MapRevelationStates.HIDDEN) {
        return { visible: false, reason: 'unrevealed', state };
    }
    if (state === mapPresence_js_1.MapRevelationStates.DRAFT) {
        return { visible: false, reason: 'draft', state };
    }
    return { visible: true, reason: 'visible', state };
}
//# sourceMappingURL=contentPresence.js.map