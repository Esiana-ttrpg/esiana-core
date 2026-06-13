/**
 * Layer 1 — canonical chronology interfaces (anchors, instants, stable ids).
 * @see docs/architecture-internal/chronology-convergence.md
 */
import type { EntityHistoricalAliasRecord } from './loreKnowledge.js';
import type { DowntimeAnnotation, DowntimeLocationMention } from './downtimeAnnotations.js';
/** Values align with `ContentPresenceEntityType` in contentPresence.ts (no import — avoids Vite CJS .js emit). */
export declare const ChronologySourceEntityType: {
    readonly TIMELINE_EVENT: "timeline_event";
    readonly SESSION_NOTE: "session_note";
    readonly MAP_OBJECT: "map_object";
    readonly HISTORICAL_ALIAS: "historical_alias";
    readonly WIKI_PAGE: "wiki_page";
};
export type ChronologyDateParts = {
    year: number | null;
    month: number | null;
    day: number | null;
};
export type ChronologyInstant = {
    epochMinute: string | null;
    dateParts: ChronologyDateParts | null;
};
export type ChronologyRange = {
    start: ChronologyInstant;
    end?: ChronologyInstant;
};
export { ChronologyDomainKind, type ChronologyDomainKindValue, } from './chronologyDomainKinds.js';
import { ChronologyDomainKind, type ChronologyDomainKindValue } from './chronologyDomainKinds.js';
/** Sort priority when epoch ties (lower first). */
export declare const CHRONOLOGY_DOMAIN_SORT_RANK: Record<ChronologyDomainKindValue, number>;
export type WorldEventPayload = {
    baseEventId: string;
    occurrenceId: string;
    categoryId: string | null;
    prerequisiteBaseEventId: string | null;
    sourceType: string;
    visibility: string;
};
export type SessionChroniclePayload = {
    timelinePointId: string;
    wikiPageId: string;
    sequenceOrder: number;
    fantasyEpochMinute: string | null;
    plannedStartAt: string | null;
    sessionTitle: string | null;
};
export type MapKeyframePayload = {
    keyframeId: string;
    sceneObjectId: string;
    mapId: string;
    sceneId: string;
    objectLabel: string | null;
    effectiveEpochMinute: string;
    hasVisibilityOverride: boolean;
    hasRevelationOverride: boolean;
};
export type LoreReferencePayload = {
    pageId: string;
    aliasStableKey: string;
    aliasName: string;
    bound: 'era_start' | 'era_end';
};
export type OrgRelationPayload = {
    orgPageId: string;
    orgTitle: string | null;
    targetOrgId: string;
    relationId: string;
    eventId: string;
    relationType: string;
    stance: string;
    visibility: string;
    sourceEventIds: string[];
};
export type QuestTransitionPayload = Record<string, never>;
export type WorldAdvanceEffectAnchorPayload = {
    batchId: string;
    effectId: string;
    effectType: string;
    projectionDomain: string;
    summary: string;
};
export type WorldAdvanceBatchPayload = {
    batchId: string;
    chronologyEventId: string;
    effectCount: number;
    synthesisHeadline: string | null;
};
export type DowntimePeriodPayload = {
    gapId: string;
    startEpochMinute: string;
    endEpochMinute: string;
    advanceRunCount: number;
    projectCompletions: number;
    projectFailures: number;
    isOpen: boolean;
    sessionBeforeId: string | null;
    sessionAfterId: string | null;
    rollupHeadline: string;
    /** GM-promoted period headline (optional overlay). */
    promotedLabel?: string | null;
    /** Entity presence / continuity references for this downtime span. */
    annotations?: DowntimeAnnotation[];
    locationMentions?: DowntimeLocationMention[];
};
/** References a map overlay — does not store polygon geometry. */
export type FactionControlPayload = {
    sceneObjectId: string;
    mapId: string;
    orgPageId: string | null;
    controlKind: 'claims' | 'occupies' | 'border_shift' | 'released';
    objectLabel: string | null;
};
export type ChronologyDomainPayload = {
    domain: typeof ChronologyDomainKind.WORLD_EVENT;
    payload: WorldEventPayload;
} | {
    domain: typeof ChronologyDomainKind.SESSION_CHRONICLE;
    payload: SessionChroniclePayload;
} | {
    domain: typeof ChronologyDomainKind.MAP_KEYFRAME;
    payload: MapKeyframePayload;
} | {
    domain: typeof ChronologyDomainKind.LORE_REFERENCE;
    payload: LoreReferencePayload;
} | {
    domain: typeof ChronologyDomainKind.ORG_RELATION;
    payload: OrgRelationPayload;
} | {
    domain: typeof ChronologyDomainKind.QUEST_TRANSITION;
    payload: QuestTransitionPayload;
} | {
    domain: typeof ChronologyDomainKind.FACTION_CONTROL;
    payload: FactionControlPayload;
} | {
    domain: typeof ChronologyDomainKind.WORLD_ADVANCE;
    payload: WorldAdvanceEffectAnchorPayload | WorldAdvanceBatchPayload;
} | {
    domain: typeof ChronologyDomainKind.DOWNTIME_PERIOD;
    payload: DowntimePeriodPayload;
};
export type CanonicalChronologyAnchor = {
    id: string;
    domain: ChronologyDomainKindValue;
    sourceEntityType: string;
    sourceEntityId: string;
    subEntityId: string | null;
    instant: ChronologyInstant;
    range?: ChronologyRange;
    title: string;
    summary: string | null;
    domainPayload: ChronologyDomainPayload;
    sessionLink: {
        timelinePointId: string;
        sequenceOrder: number;
    } | null;
};
export declare function normalizeChronologyDateParts(raw: unknown): ChronologyDateParts | null;
export declare function chronologyInstantFromParts(parts: ChronologyDateParts | null, epochMinute?: string | bigint | null): ChronologyInstant;
export declare function chronologyInstantKey(instant: ChronologyInstant): string;
export declare function dateSortKey(parts: ChronologyDateParts): number;
export declare function compareChronologyDateParts(a: ChronologyDateParts, b: ChronologyDateParts): number;
export declare function chronologyInstantSortKey(instant: ChronologyInstant): bigint;
export declare function compareChronologyInstants(a: ChronologyInstant, b: ChronologyInstant): number;
export declare function formatChronologyDateLabel(instant: ChronologyInstant): string | null;
export declare function formatChronologyRangeDateLabel(range: ChronologyRange): string | null;
export declare function buildChronologyEntryId(input: {
    domain: ChronologyDomainKindValue;
    sourceEntityType: string;
    sourceEntityId: string;
    subEntityId?: string | null;
    instant: ChronologyInstant;
}): string;
export type TimelineOccurrenceAnchorInput = {
    occurrenceId: string;
    baseEventId: string;
    title: string;
    description: string | null;
    visibility: string;
    categoryId: string | null;
    prerequisiteBaseEventId: string | null;
    sourceType: string;
    start: {
        year: number | null;
        month: number | null;
        day: number | null;
        epochMinute: string | null;
    };
};
export declare function anchorFromTimelineOccurrence(row: TimelineOccurrenceAnchorInput): CanonicalChronologyAnchor;
export type SessionTimelineAnchorInput = {
    timelinePointId: string;
    wikiPageId: string;
    sequenceOrder: number;
    title: string;
    summary: string | null;
    fantasyEpochMinute: string | null;
    plannedStartAt: string | null;
};
export declare function anchorFromSessionTimelinePoint(row: SessionTimelineAnchorInput): CanonicalChronologyAnchor;
export type MapKeyframeAnchorInput = {
    keyframeId: string;
    sceneObjectId: string;
    mapId: string;
    sceneId: string;
    objectLabel: string | null;
    effectiveEpochMinute: string | bigint;
    visibilityOverride: string | null;
    revelationOverride: string | null;
};
export declare function anchorFromMapKeyframe(row: MapKeyframeAnchorInput): CanonicalChronologyAnchor;
export declare function anchorFromHistoricalAlias(alias: EntityHistoricalAliasRecord, pageTitle: string, bound: 'era_start' | 'era_end'): CanonicalChronologyAnchor | null;
export type OrgRelationEventAnchorInput = {
    orgPageId: string;
    orgTitle: string | null;
    targetOrgId: string;
    relationId: string;
    eventId: string;
    effectiveDate: ChronologyDateParts;
    relationType: string;
    stance: string;
    visibility: string;
    sourceEventIds: string[];
    note: string | null;
};
export declare function anchorFromOrgRelationEvent(row: OrgRelationEventAnchorInput): CanonicalChronologyAnchor;
export type FactionControlAnchorInput = {
    sceneObjectId: string;
    mapId: string;
    orgPageId: string | null;
    controlKind: FactionControlPayload['controlKind'];
    objectLabel: string | null;
    effectiveEpochMinute: string | bigint;
};
export declare function anchorFromFactionControl(row: FactionControlAnchorInput): CanonicalChronologyAnchor;
export type WorldAdvanceEffectAnchorInput = {
    chronologyEventId: string;
    batchId: string;
    effectId: string;
    effectType: string;
    projectionDomain: string;
    summary: string;
    targetEpochMinute: string | bigint;
    synthesisHeadline?: string | null;
};
export declare function anchorFromWorldAdvanceEffect(row: WorldAdvanceEffectAnchorInput): CanonicalChronologyAnchor;
export type DowntimePeriodAnchorInput = {
    gapId: string;
    startEpochMinute: string;
    endEpochMinute: string;
    startDateParts: ChronologyDateParts | null;
    endDateParts: ChronologyDateParts | null;
    title: string;
    summary: string | null;
    sessionBeforeId: string | null;
    sessionAfterId: string | null;
    isOpen: boolean;
    advanceRunCount: number;
    projectCompletions: number;
    projectFailures: number;
    rollupHeadline: string;
    promotedLabel?: string | null;
    annotations?: DowntimeAnnotation[];
    locationMentions?: DowntimeLocationMention[];
    sessionBeforeSequenceOrder?: number | null;
};
export declare function buildDowntimePeriodGapId(startEpochMinute: string, endEpochMinute: string): string;
export declare function anchorFromDowntimePeriod(row: DowntimePeriodAnchorInput): CanonicalChronologyAnchor;
export declare function buildSessionSortOrdinal(sequenceOrder: number): string;
export declare function buildChronologySortOrdinal(anchor: CanonicalChronologyAnchor): string;
export type ChronologyWindowQuery = {
    mode: string;
    from: string;
    to: string;
};
export declare function instantMatchesWindow(instant: ChronologyInstant, window: ChronologyWindowQuery): boolean;
//# sourceMappingURL=chronologyTypes.d.ts.map