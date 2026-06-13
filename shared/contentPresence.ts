/**
 * Cross-system content presence contracts (Phase 9 fog engine).
 * Canonical source: ContentPresenceState records with optional sub-entity overrides.
 */
import {
  MapRevelationStates as ContentRevelationStates,
  type MapRevelationState as ContentRevelationState,
} from './mapPresence.js';

export { ContentRevelationStates };
export type { ContentRevelationState };

export const ContentPresenceEntityType = {
  WIKI_PAGE: 'wiki_page',
  WIKI_BLOCK: 'wiki_block',
  TIMELINE_EVENT: 'timeline_event',
  SESSION_NOTE: 'session_note',
  MAP_OBJECT: 'map_object',
  SEARCH_RESULT: 'search_result',
  HISTORICAL_ALIAS: 'historical_alias',
  LORE_INTERPRETATION: 'lore_interpretation',
  LORE_CLAIM: 'lore_claim',
} as const;

export type ContentPresenceEntityType =
  (typeof ContentPresenceEntityType)[keyof typeof ContentPresenceEntityType];

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
  reason:
    | 'visible'
    | 'unrevealed'
    | 'draft'
    | 'missing_state'
    | 'invalid_state';
  state: ContentRevelationState;
};

/** Precedence: sub-entity override > entity-level state > default (revealed). */
export function resolveContentPresenceState(
  records: ContentPresenceStateRecord[],
  defaultState: ContentRevelationState = ContentRevelationStates.REVEALED,
): ContentRevelationState {
  if (records.length === 0) return defaultState;
  const state = records[0]?.state;
  if (
    state === ContentRevelationStates.REVEALED ||
    state === ContentRevelationStates.HIDDEN ||
    state === ContentRevelationStates.DRAFT
  ) {
    return state;
  }
  return defaultState;
}

export function evaluateContentPresence(
  state: ContentRevelationState,
): ContentPresenceDecision {
  if (state === ContentRevelationStates.HIDDEN) {
    return { visible: false, reason: 'unrevealed', state };
  }
  if (state === ContentRevelationStates.DRAFT) {
    return { visible: false, reason: 'draft', state };
  }
  return { visible: true, reason: 'visible', state };
}
