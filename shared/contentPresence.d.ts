/**
 * Cross-system content presence contracts (Phase 9 fog engine).
 * Canonical source: ContentPresenceState records with optional sub-entity overrides.
 */
import { MapRevelationStates as ContentRevelationStates, type MapRevelationState as ContentRevelationState } from './mapPresence.js';
export { ContentRevelationStates };
export type { ContentRevelationState };
export declare const ContentPresenceEntityType: {
    readonly WIKI_PAGE: "wiki_page";
    readonly WIKI_BLOCK: "wiki_block";
    readonly TIMELINE_EVENT: "timeline_event";
    readonly SESSION_NOTE: "session_note";
    readonly MAP_OBJECT: "map_object";
    readonly SEARCH_RESULT: "search_result";
    readonly HISTORICAL_ALIAS: "historical_alias";
    readonly LORE_INTERPRETATION: "lore_interpretation";
    readonly LORE_CLAIM: "lore_claim";
};
export type ContentPresenceEntityType = (typeof ContentPresenceEntityType)[keyof typeof ContentPresenceEntityType];
export type ContentPresenceStateRecord = {
    campaignId: string;
    entityType: ContentPresenceEntityType | string;
    entityId: string;
    subEntityId?: string | null;
    state: ContentRevelationState | string;
    workflowKey?: string | null;
    reason?: string | null;
    revealedByUserId?: string | null;
    revealedAt?: string | null;
    availableFromEpochMinute?: number | null;
};
export type ContentPresenceDecision = {
    visible: boolean;
    reason: 'visible' | 'unrevealed' | 'draft' | 'missing_state' | 'invalid_state';
    state: ContentRevelationState;
};
/** Precedence: sub-entity override > entity-level state > default (revealed). */
export declare function resolveContentPresenceState(records: ContentPresenceStateRecord[], defaultState?: ContentRevelationState): ContentRevelationState;
export declare function evaluateContentPresence(state: ContentRevelationState): ContentPresenceDecision;
//# sourceMappingURL=contentPresence.d.ts.map