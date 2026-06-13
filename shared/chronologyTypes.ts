/**
 * Layer 1 — canonical chronology interfaces (anchors, instants, stable ids).
 * @see docs/architecture-internal/chronology-convergence.md
 */
import type { EntityHistoricalAliasRecord } from './loreKnowledge.js';
import { formatWorldEventFeedSummary } from './convergenceFeedDisplay.js';
import type {
  DowntimeAnnotation,
  DowntimeLocationMention,
} from './downtimeAnnotations.js';

/** Values align with `ContentPresenceEntityType` in contentPresence.ts (no import — avoids Vite CJS .js emit). */
export const ChronologySourceEntityType = {
  TIMELINE_EVENT: 'timeline_event',
  SESSION_NOTE: 'session_note',
  MAP_OBJECT: 'map_object',
  HISTORICAL_ALIAS: 'historical_alias',
  WIKI_PAGE: 'wiki_page',
} as const;

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

export {
  ChronologyDomainKind,
  type ChronologyDomainKindValue,
} from './chronologyDomainKinds.js';
import { ChronologyDomainKind, type ChronologyDomainKindValue } from './chronologyDomainKinds.js';

/** Sort priority when epoch ties (lower first). */
export const CHRONOLOGY_DOMAIN_SORT_RANK: Record<ChronologyDomainKindValue, number> = {
  [ChronologyDomainKind.WORLD_EVENT]: 0,
  [ChronologyDomainKind.SESSION_CHRONICLE]: 1,
  [ChronologyDomainKind.DOWNTIME_PERIOD]: 2,
  [ChronologyDomainKind.ORG_RELATION]: 3,
  [ChronologyDomainKind.MAP_KEYFRAME]: 4,
  [ChronologyDomainKind.LORE_REFERENCE]: 5,
  [ChronologyDomainKind.QUEST_TRANSITION]: 6,
  [ChronologyDomainKind.FACTION_CONTROL]: 7,
  [ChronologyDomainKind.WORLD_ADVANCE]: 8,
};

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

export type ChronologyDomainPayload =
  | { domain: typeof ChronologyDomainKind.WORLD_EVENT; payload: WorldEventPayload }
  | { domain: typeof ChronologyDomainKind.SESSION_CHRONICLE; payload: SessionChroniclePayload }
  | { domain: typeof ChronologyDomainKind.MAP_KEYFRAME; payload: MapKeyframePayload }
  | { domain: typeof ChronologyDomainKind.LORE_REFERENCE; payload: LoreReferencePayload }
  | { domain: typeof ChronologyDomainKind.ORG_RELATION; payload: OrgRelationPayload }
  | { domain: typeof ChronologyDomainKind.QUEST_TRANSITION; payload: QuestTransitionPayload }
  | { domain: typeof ChronologyDomainKind.FACTION_CONTROL; payload: FactionControlPayload }
  | {
      domain: typeof ChronologyDomainKind.WORLD_ADVANCE;
      payload: WorldAdvanceEffectAnchorPayload | WorldAdvanceBatchPayload;
    }
  | {
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
  sessionLink: { timelinePointId: string; sequenceOrder: number } | null;
};

export function normalizeChronologyDateParts(raw: unknown): ChronologyDateParts | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const parseIntField = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.floor(value);
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };
  const year = parseIntField(obj.year);
  const month = parseIntField(obj.month);
  const day = parseIntField(obj.day);
  if (year === null && month === null && day === null) return null;
  return { year, month, day };
}

export function chronologyInstantFromParts(
  parts: ChronologyDateParts | null,
  epochMinute?: string | bigint | null,
): ChronologyInstant {
  const epoch =
    epochMinute === null || epochMinute === undefined
      ? null
      : String(epochMinute);
  return {
    epochMinute: epoch && epoch.trim() ? epoch : null,
    dateParts: parts,
  };
}

export function chronologyInstantKey(instant: ChronologyInstant): string {
  if (instant.epochMinute?.trim()) {
    return `e:${instant.epochMinute.trim()}`;
  }
  const p = instant.dateParts;
  if (p && (p.year !== null || p.month !== null || p.day !== null)) {
    return `d:${p.year ?? ''}:${p.month ?? ''}:${p.day ?? ''}`;
  }
  return 'u:unknown';
}

export function dateSortKey(parts: ChronologyDateParts): number {
  const year = parts.year ?? 0;
  const month = parts.month ?? 0;
  const day = parts.day ?? 0;
  return year * 10000 + month * 100 + day;
}

export function compareChronologyDateParts(
  a: ChronologyDateParts,
  b: ChronologyDateParts,
): number {
  const ay = a.year ?? Number.NEGATIVE_INFINITY;
  const by = b.year ?? Number.NEGATIVE_INFINITY;
  if (ay !== by) return ay < by ? -1 : 1;
  const am = a.month ?? -1;
  const bm = b.month ?? -1;
  if (am !== bm) return am < bm ? -1 : 1;
  const ad = a.day ?? -1;
  const bd = b.day ?? -1;
  if (ad !== bd) return ad < bd ? -1 : 1;
  return 0;
}

export function chronologyInstantSortKey(instant: ChronologyInstant): bigint {
  if (instant.epochMinute?.trim()) {
    try {
      return BigInt(instant.epochMinute.trim());
    } catch {
      return 0n;
    }
  }
  const p = instant.dateParts;
  if (p) {
    const y = BigInt(p.year ?? 0);
    const m = BigInt(p.month ?? 0);
    const d = BigInt(p.day ?? 0);
    return y * 1_000_000n + m * 1_000n + d;
  }
  return 0n;
}

export function compareChronologyInstants(
  a: ChronologyInstant,
  b: ChronologyInstant,
): number {
  const ak = chronologyInstantSortKey(a);
  const bk = chronologyInstantSortKey(b);
  if (ak < bk) return -1;
  if (ak > bk) return 1;
  return 0;
}

export function formatChronologyDateLabel(
  instant: ChronologyInstant,
): string | null {
  const p = instant.dateParts;
  if (!p) return null;
  const y = p.year ?? '?';
  const m = p.month !== null ? String(p.month + 1) : '?';
  const d = p.day ?? '?';
  return `${y}-${m}-${d}`;
}

export function formatChronologyRangeDateLabel(
  range: ChronologyRange,
): string | null {
  const startLabel = formatChronologyDateLabel(range.start);
  const endLabel = range.end ? formatChronologyDateLabel(range.end) : null;
  if (startLabel && endLabel) {
    if (startLabel === endLabel) return startLabel;
    return `${startLabel} – ${endLabel}`;
  }
  return startLabel ?? endLabel ?? null;
}

export function buildChronologyEntryId(input: {
  domain: ChronologyDomainKindValue;
  sourceEntityType: string;
  sourceEntityId: string;
  subEntityId?: string | null;
  instant: ChronologyInstant;
}): string {
  const sub = input.subEntityId?.trim() ?? '';
  return `${input.domain}:${input.sourceEntityType}:${input.sourceEntityId}:${sub}:${chronologyInstantKey(input.instant)}`;
}

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

export function anchorFromTimelineOccurrence(
  row: TimelineOccurrenceAnchorInput,
): CanonicalChronologyAnchor {
  const instant = chronologyInstantFromParts(
    {
      year: row.start.year,
      month: row.start.month,
      day: row.start.day,
    },
    row.start.epochMinute,
  );
  const sourceEntityType = ChronologySourceEntityType.TIMELINE_EVENT;
  const sourceEntityId = row.baseEventId;
  const subEntityId = row.occurrenceId;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.WORLD_EVENT,
      sourceEntityType,
      sourceEntityId,
      subEntityId,
      instant,
    }),
    domain: ChronologyDomainKind.WORLD_EVENT,
    sourceEntityType,
    sourceEntityId,
    subEntityId,
    instant,
    title: row.title,
    summary: formatWorldEventFeedSummary(row.description),
    domainPayload: {
      domain: ChronologyDomainKind.WORLD_EVENT,
      payload: {
        baseEventId: row.baseEventId,
        occurrenceId: row.occurrenceId,
        categoryId: row.categoryId,
        prerequisiteBaseEventId: row.prerequisiteBaseEventId,
        sourceType: row.sourceType,
        visibility: row.visibility,
      },
    },
    sessionLink: null,
  };
}

export type SessionTimelineAnchorInput = {
  timelinePointId: string;
  wikiPageId: string;
  sequenceOrder: number;
  title: string;
  summary: string | null;
  fantasyEpochMinute: string | null;
  plannedStartAt: string | null;
};

export function anchorFromSessionTimelinePoint(
  row: SessionTimelineAnchorInput,
): CanonicalChronologyAnchor {
  const instant = chronologyInstantFromParts(null, row.fantasyEpochMinute);
  const sourceEntityType = ChronologySourceEntityType.SESSION_NOTE;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.SESSION_CHRONICLE,
      sourceEntityType,
      sourceEntityId: row.timelinePointId,
      subEntityId: row.wikiPageId,
      instant,
    }),
    domain: ChronologyDomainKind.SESSION_CHRONICLE,
    sourceEntityType,
    sourceEntityId: row.timelinePointId,
    subEntityId: row.wikiPageId,
    instant,
    title: row.title,
    summary: row.summary,
    domainPayload: {
      domain: ChronologyDomainKind.SESSION_CHRONICLE,
      payload: {
        timelinePointId: row.timelinePointId,
        wikiPageId: row.wikiPageId,
        sequenceOrder: row.sequenceOrder,
        fantasyEpochMinute: row.fantasyEpochMinute,
        plannedStartAt: row.plannedStartAt,
        sessionTitle: row.title,
      },
    },
    sessionLink: {
      timelinePointId: row.timelinePointId,
      sequenceOrder: row.sequenceOrder,
    },
  };
}

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

export function anchorFromMapKeyframe(
  row: MapKeyframeAnchorInput,
): CanonicalChronologyAnchor {
  const epoch = String(row.effectiveEpochMinute);
  const instant = chronologyInstantFromParts(null, epoch);
  const sourceEntityType = ChronologySourceEntityType.MAP_OBJECT;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.MAP_KEYFRAME,
      sourceEntityType,
      sourceEntityId: row.sceneObjectId,
      subEntityId: row.keyframeId,
      instant,
    }),
    domain: ChronologyDomainKind.MAP_KEYFRAME,
    sourceEntityType,
    sourceEntityId: row.sceneObjectId,
    subEntityId: row.keyframeId,
    instant,
    title: row.objectLabel
      ? `${row.objectLabel} — map state`
      : 'Map object state change',
    summary: null,
    domainPayload: {
      domain: ChronologyDomainKind.MAP_KEYFRAME,
      payload: {
        keyframeId: row.keyframeId,
        sceneObjectId: row.sceneObjectId,
        mapId: row.mapId,
        sceneId: row.sceneId,
        objectLabel: row.objectLabel,
        effectiveEpochMinute: epoch,
        hasVisibilityOverride: Boolean(row.visibilityOverride),
        hasRevelationOverride: Boolean(row.revelationOverride),
      },
    },
    sessionLink: null,
  };
}

export function anchorFromHistoricalAlias(
  alias: EntityHistoricalAliasRecord,
  pageTitle: string,
  bound: 'era_start' | 'era_end',
): CanonicalChronologyAnchor | null {
  const parts = bound === 'era_start' ? alias.eraStart : alias.eraEnd;
  if (!parts) return null;
  const instant = chronologyInstantFromParts(parts, null);
  const sourceEntityType = ChronologySourceEntityType.HISTORICAL_ALIAS;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.LORE_REFERENCE,
      sourceEntityType,
      sourceEntityId: alias.pageId,
      subEntityId: `${alias.stableKey}:${bound}`,
      instant,
    }),
    domain: ChronologyDomainKind.LORE_REFERENCE,
    sourceEntityType,
    sourceEntityId: alias.pageId,
    subEntityId: `${alias.stableKey}:${bound}`,
    instant,
    title: `${alias.name} (${bound === 'era_start' ? 'era start' : 'era end'})`,
    summary: pageTitle,
    domainPayload: {
      domain: ChronologyDomainKind.LORE_REFERENCE,
      payload: {
        pageId: alias.pageId,
        aliasStableKey: alias.stableKey,
        aliasName: alias.name,
        bound,
      },
    },
    sessionLink: null,
  };
}

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

export function anchorFromOrgRelationEvent(
  row: OrgRelationEventAnchorInput,
): CanonicalChronologyAnchor {
  const instant = chronologyInstantFromParts(row.effectiveDate, null);
  const sourceEntityType = ChronologySourceEntityType.WIKI_PAGE;
  const title = `${row.stance} — ${row.relationType}`;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.ORG_RELATION,
      sourceEntityType,
      sourceEntityId: row.orgPageId,
      subEntityId: row.eventId,
      instant,
    }),
    domain: ChronologyDomainKind.ORG_RELATION,
    sourceEntityType,
    sourceEntityId: row.orgPageId,
    subEntityId: row.eventId,
    instant,
    title,
    summary: row.note,
    domainPayload: {
      domain: ChronologyDomainKind.ORG_RELATION,
      payload: {
        orgPageId: row.orgPageId,
        orgTitle: row.orgTitle,
        targetOrgId: row.targetOrgId,
        relationId: row.relationId,
        eventId: row.eventId,
        relationType: row.relationType,
        stance: row.stance,
        visibility: row.visibility,
        sourceEventIds: row.sourceEventIds,
      },
    },
    sessionLink: null,
  };
}

export type FactionControlAnchorInput = {
  sceneObjectId: string;
  mapId: string;
  orgPageId: string | null;
  controlKind: FactionControlPayload['controlKind'];
  objectLabel: string | null;
  effectiveEpochMinute: string | bigint;
};

export function anchorFromFactionControl(
  row: FactionControlAnchorInput,
): CanonicalChronologyAnchor {
  const epoch = String(row.effectiveEpochMinute);
  const instant = chronologyInstantFromParts(null, epoch);
  const sourceEntityType = ChronologySourceEntityType.MAP_OBJECT;
  const title = row.objectLabel
    ? `${row.controlKind} — ${row.objectLabel}`
    : `Territory ${row.controlKind}`;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.FACTION_CONTROL,
      sourceEntityType,
      sourceEntityId: row.sceneObjectId,
      subEntityId: `${row.controlKind}:${epoch}`,
      instant,
    }),
    domain: ChronologyDomainKind.FACTION_CONTROL,
    sourceEntityType,
    sourceEntityId: row.sceneObjectId,
    subEntityId: `${row.controlKind}:${epoch}`,
    instant,
    title,
    summary: row.orgPageId ? `Org ${row.orgPageId}` : null,
    domainPayload: {
      domain: ChronologyDomainKind.FACTION_CONTROL,
      payload: {
        sceneObjectId: row.sceneObjectId,
        mapId: row.mapId,
        orgPageId: row.orgPageId,
        controlKind: row.controlKind,
        objectLabel: row.objectLabel,
      },
    },
    sessionLink: null,
  };
}

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

export function anchorFromWorldAdvanceEffect(
  row: WorldAdvanceEffectAnchorInput,
): CanonicalChronologyAnchor {
  const epoch = String(row.targetEpochMinute);
  const instant = chronologyInstantFromParts(null, epoch);
  const sourceEntityType = ChronologySourceEntityType.TIMELINE_EVENT;
  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.WORLD_ADVANCE,
      sourceEntityType,
      sourceEntityId: row.chronologyEventId,
      subEntityId: row.effectId,
      instant,
    }),
    domain: ChronologyDomainKind.WORLD_ADVANCE,
    sourceEntityType,
    sourceEntityId: row.chronologyEventId,
    subEntityId: row.effectId,
    instant,
    title: row.summary,
    summary: row.synthesisHeadline ?? `Batch ${row.batchId}`,
    domainPayload: {
      domain: ChronologyDomainKind.WORLD_ADVANCE,
      payload: {
        batchId: row.batchId,
        effectId: row.effectId,
        effectType: row.effectType,
        projectionDomain: row.projectionDomain,
        summary: row.summary,
      },
    },
    sessionLink: null,
  };
}

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

export function buildDowntimePeriodGapId(
  startEpochMinute: string,
  endEpochMinute: string,
): string {
  return `gap:${startEpochMinute}:${endEpochMinute}`;
}

export function anchorFromDowntimePeriod(
  row: DowntimePeriodAnchorInput,
): CanonicalChronologyAnchor {
  const startInstant = chronologyInstantFromParts(
    row.startDateParts,
    row.startEpochMinute,
  );
  const endInstant = chronologyInstantFromParts(
    row.endDateParts,
    row.endEpochMinute,
  );
  const sourceEntityType = ChronologySourceEntityType.TIMELINE_EVENT;
  const sessionLink =
    row.sessionBeforeId != null
      ? {
          timelinePointId: row.sessionBeforeId,
          sequenceOrder: row.sessionBeforeSequenceOrder ?? 0,
        }
      : null;

  return {
    id: buildChronologyEntryId({
      domain: ChronologyDomainKind.DOWNTIME_PERIOD,
      sourceEntityType,
      sourceEntityId: row.gapId,
      subEntityId: null,
      instant: startInstant,
    }),
    domain: ChronologyDomainKind.DOWNTIME_PERIOD,
    sourceEntityType,
    sourceEntityId: row.gapId,
    subEntityId: null,
    instant: startInstant,
    range: { start: startInstant, end: endInstant },
    title: row.promotedLabel?.trim() || row.title,
    summary: row.summary ?? row.rollupHeadline,
    domainPayload: {
      domain: ChronologyDomainKind.DOWNTIME_PERIOD,
      payload: {
        gapId: row.gapId,
        startEpochMinute: row.startEpochMinute,
        endEpochMinute: row.endEpochMinute,
        advanceRunCount: row.advanceRunCount,
        projectCompletions: row.projectCompletions,
        projectFailures: row.projectFailures,
        isOpen: row.isOpen,
        sessionBeforeId: row.sessionBeforeId,
        sessionAfterId: row.sessionAfterId,
        rollupHeadline: row.rollupHeadline,
        promotedLabel: row.promotedLabel ?? null,
        annotations: row.annotations,
        locationMentions: row.locationMentions,
      },
    },
    sessionLink,
  };
}

export function buildSessionSortOrdinal(sequenceOrder: number): string {
  const paddedSeq = String(sequenceOrder).padStart(8, '0');
  return `000000000000000:${paddedSeq}`;
}

export function buildChronologySortOrdinal(
  anchor: CanonicalChronologyAnchor,
): string {
  const epochKey = chronologyInstantSortKey(anchor.instant);
  const epochPadded = epochKey.toString().padStart(20, '0');
  if (
    epochKey === 0n &&
    anchor.domain === ChronologyDomainKind.SESSION_CHRONICLE &&
    anchor.domainPayload.domain === ChronologyDomainKind.SESSION_CHRONICLE
  ) {
    return buildSessionSortOrdinal(anchor.domainPayload.payload.sequenceOrder);
  }
  const domainRank = String(CHRONOLOGY_DOMAIN_SORT_RANK[anchor.domain]).padStart(2, '0');
  const entity = anchor.sourceEntityId.padStart(32, '0').slice(0, 32);
  const sub = (anchor.subEntityId ?? '').padStart(32, '0').slice(0, 32);
  return `${epochPadded}:${domainRank}:${entity}:${sub}`;
}

export type ChronologyWindowQuery = {
  mode: string;
  from: string;
  to: string;
};

export function instantMatchesWindow(
  instant: ChronologyInstant,
  window: ChronologyWindowQuery,
): boolean {
  const mode = window.mode.toUpperCase();
  if (mode === 'EPOCH_RANGE') {
    const epoch = chronologyInstantSortKey(instant);
    let from = 0n;
    let to = BigInt('999999999999999999');
    try {
      from = BigInt(window.from);
    } catch {
      /* keep default */
    }
    try {
      to = BigInt(window.to);
    } catch {
      /* keep default */
    }
    if (epoch === 0n) return true;
    return epoch >= from && epoch <= to;
  }
  const fromYear = Number.parseInt(window.from, 10);
  const toYear = Number.parseInt(window.to, 10);
  const fy = Number.isFinite(fromYear) ? fromYear : 0;
  const ty = Number.isFinite(toYear) ? toYear : 9999;
  const p = instant.dateParts;
  if (p && p.year !== null && p.year !== undefined) {
    return p.year >= fy && p.year <= ty;
  }
  if (instant.epochMinute) return true;
  return true;
}
