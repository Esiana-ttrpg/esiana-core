/**
 * Layer 1 — world event prompts from pressure (browser-safe contracts).
 * Advisory only; canon enters via GM accept → CalendarEvent.
 * @see docs/architecture-internal/faction-momentum.md
 */
import type { AdvanceMagnitude } from './globalTimeHooks.js';
import type { FactionMomentumState } from './factionMomentumMetadata.js';
import type { WorldPressureProjection } from './worldPressureProjection.js';
export declare const WORLD_EVENT_SUGGESTION_SEMANTICS_VERSION = "world-event-suggestion-v1";
export declare const WORLD_PRESSURE_EVENT_METADATA_VERSION = "world-pressure-event-v1";
export declare const RECENT_SIMILAR_SUGGESTION_WINDOW_MINUTES: number;
export declare const WORLD_EVENT_SUGGESTION_STATUSES: readonly ["pending", "accepted", "dismissed"];
export type WorldEventSuggestionStatus = (typeof WORLD_EVENT_SUGGESTION_STATUSES)[number];
export declare const WORLD_EVENT_SUGGESTION_KINDS: readonly ["faction_pressure", "era_trend"];
export type WorldEventSuggestionKind = (typeof WORLD_EVENT_SUGGESTION_KINDS)[number];
export declare const WORLD_EVENT_SUGGESTION_SOURCE_TYPES: readonly ["time_hook", "other"];
export type WorldEventSuggestionSourceType = (typeof WORLD_EVENT_SUGGESTION_SOURCE_TYPES)[number];
export declare const WORLD_EVENT_NARRATIVE_MAX_LENGTH = 500;
export type TrendDirection = 'growth' | 'decline' | 'destabilizing';
export declare const MOMENTUM_TO_TREND_DIRECTION: Record<FactionMomentumState, TrendDirection | null>;
export type WorldPressureEventMetadata = {
    version: typeof WORLD_PRESSURE_EVENT_METADATA_VERSION;
    source: 'world_pressure';
    suggestionId: string;
    hookVersion: string;
    projectionEpoch: string;
    primaryOrgPageId?: string | null;
    eraId?: string | null;
    momentumState?: string | null;
    trendDirection?: TrendDirection | null;
};
export type WorldEventSuggestionCore = {
    id: string;
    status: WorldEventSuggestionStatus;
    kind: WorldEventSuggestionKind;
    title: string;
    narrative: string | null;
    occurredAtEpochMinute: string;
    sourceType: WorldEventSuggestionSourceType;
    sourceRef: string;
    idempotencyKey: string;
    primaryOrgPageId: string | null;
    eraId: string | null;
    momentumState: string | null;
    trendDirection: TrendDirection | null;
    acceptedCalendarEventId: string | null;
    resolvedByUserId: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
};
export type WorldEventPromptDraft = {
    kind: WorldEventSuggestionKind;
    title: string;
    narrative: string | null;
    idempotencyKey: string;
    primaryOrgPageId: string | null;
    eraId: string | null;
    momentumState: string | null;
    trendDirection: TrendDirection | null;
};
export declare function normalizeWorldEventSuggestionStatus(raw: unknown): WorldEventSuggestionStatus;
export declare function normalizeWorldEventSuggestionKind(raw: unknown): WorldEventSuggestionKind | null;
export declare function normalizeWorldEventSuggestionSourceType(raw: unknown): WorldEventSuggestionSourceType;
export declare function normalizeWorldEventNarrative(raw: unknown): string | null;
export declare function isEligibleAdvanceMagnitudeForPrompts(magnitude: AdvanceMagnitude): boolean;
export declare function deriveWorldEventPromptCandidates(projection: WorldPressureProjection, context: {
    advanceMagnitude: AdvanceMagnitude;
    nextEpochMinute: string;
    batchId?: string;
}): WorldEventPromptDraft[];
export declare function buildWorldPressureEventMetadata(input: {
    suggestionId: string;
    hookVersion: string;
    projectionEpoch: string;
    primaryOrgPageId?: string | null;
    eraId?: string | null;
    momentumState?: string | null;
    trendDirection?: TrendDirection | null;
}): WorldPressureEventMetadata;
export declare function formatWorldEventSuggestionKindLabel(kind: WorldEventSuggestionKind): string;
export declare function formatMomentumStateLabel(state: string | null): string | null;
//# sourceMappingURL=worldEventSuggestionMetadata.d.ts.map