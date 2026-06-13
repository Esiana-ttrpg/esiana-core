/**
 * Layer 1 — cross-domain chronology convergence (serializable feed primitive).
 */
import { ContentRevelationStates } from './contentPresence.js';
import type { ContentRevelationState } from './contentPresence.js';
import {
  buildChronologySortOrdinal,
  ChronologyDomainKind,
  type CanonicalChronologyAnchor,
  type ChronologyDomainKindValue,
  type ChronologyDomainPayload,
  type ChronologyInstant,
  type ChronologyWindowQuery,
  formatChronologyDateLabel,
  formatChronologyRangeDateLabel,
  instantMatchesWindow,
} from './chronologyTypes.js';
import {
  formatConvergenceFeedTitle,
} from './convergenceFeedDisplay.js';
import { asPublicPagePath, type PublicPagePath } from './publicPagePath.js';
import {
  isTimelineEventVisible,
  NarrativeVisibilityTier,
  projectEntityRelation,
  projectRevelation,
  projectTimelineEventVisibility,
  resolvePresenceState,
  TemporalHistoricalMode,
  type NarrativeViewerContext,
  type NarrativeVisibilityTierValue,
} from './narrativeProjection.js';

export const CONVERGENCE_BUNDLE_VERSION = 'convergence-v1';
export const CONVERGENCE_COLLECTOR_VERSION = '1';
export const CONVERGENCE_MAX_ENTRIES = 2000;

export type ConvergenceSourceRef = {
  domain: ChronologyDomainKindValue;
  entityType: string;
  entityId: string;
  subEntityId: string | null;
  collectorVersion: string;
  collectedFrom: string;
};

export type ConvergenceTimelineLink = {
  hrefKind: string;
  path: PublicPagePath;
};

export type ConvergenceEntryProjection = {
  visible: boolean;
  visibilityTier: NarrativeVisibilityTierValue;
  revelationState: ContentRevelationState | null;
  temporalMode: (typeof TemporalHistoricalMode)[keyof typeof TemporalHistoricalMode];
  suppressReason: string | null;
};

export type ConvergenceTimelineEntry = {
  entryId: string;
  sortOrdinal: string;
  instant: ChronologyInstant;
  display: {
    title: string;
    summary: string | null;
    dateLabel: string | null;
  };
  source: ConvergenceSourceRef;
  domain: ChronologyDomainKindValue;
  domainPayload: ChronologyDomainPayload;
  projection: ConvergenceEntryProjection;
  links: ConvergenceTimelineLink[];
  sessionLink: { timelinePointId: string; sequenceOrder: number } | null;
};

export type ConvergenceOverlayBundle = {
  bundleVersion: string;
  evaluatedAt: string;
  projectionContextHash: string;
  campaignNowEpochMinute: string;
  viewerRole: string | null;
  window: ChronologyWindowQuery;
  domains: ChronologyDomainKindValue[];
  sourcesIncluded: ChronologyDomainKindValue[];
  entries: ConvergenceTimelineEntry[];
  truncation: {
    capped: boolean;
    maxEntries: number;
    totalCollected: number;
  };
};

export type CampaignLinkContext = {
  campaignHandle: string;
  /** Resolve workspace-first browser paths for wiki pages referenced by id only. */
  resolveWikiPagePath?: (pageId: string) => PublicPagePath | null;
};

export function buildProjectionContextHash(
  ctx: NarrativeViewerContext,
): string {
  const epoch = ctx.campaignNow.epochMinute.toString();
  return `${ctx.perspective}:${ctx.role ?? 'none'}:${epoch}`;
}

export function buildCampaignLinks(
  anchor: CanonicalChronologyAnchor,
  linkCtx: CampaignLinkContext,
): ConvergenceTimelineLink[] {
  const slug = linkCtx.campaignHandle;
  const links: ConvergenceTimelineLink[] = [];
  const payload = anchor.domainPayload;

  if (payload.domain === ChronologyDomainKind.WORLD_EVENT) {
    links.push({
      hrefKind: 'event_lore',
      path: asPublicPagePath(`/campaigns/${slug}/event-${payload.payload.baseEventId}`),
    });
    links.push({
      hrefKind: 'chronology_events',
      path: asPublicPagePath(`/campaigns/${slug}/chronology?view=events`),
    });
  } else if (payload.domain === ChronologyDomainKind.SESSION_CHRONICLE) {
    links.push({
      hrefKind: 'session_note',
      path: asPublicPagePath(`/campaigns/${slug}/notes/${payload.payload.timelinePointId}`),
    });
  } else if (payload.domain === ChronologyDomainKind.MAP_KEYFRAME) {
    const q = new URLSearchParams({
      viewEpochMinute: payload.payload.effectiveEpochMinute,
    });
    links.push({
      hrefKind: 'map_scene',
      path: asPublicPagePath(`/campaigns/${slug}/maps/${payload.payload.mapId}?${q.toString()}`),
    });
  } else if (payload.domain === ChronologyDomainKind.ORG_RELATION) {
    const orgPath =
      linkCtx.resolveWikiPagePath?.(payload.payload.orgPageId) ??
      asPublicPagePath(`/campaigns/${slug}/${payload.payload.orgPageId}`);
    links.push({
      hrefKind: 'wiki_page',
      path: orgPath,
    });
  } else if (payload.domain === ChronologyDomainKind.LORE_REFERENCE) {
    const lorePath =
      linkCtx.resolveWikiPagePath?.(payload.payload.pageId) ??
      asPublicPagePath(`/campaigns/${slug}/${payload.payload.pageId}`);
    links.push({
      hrefKind: 'wiki_page',
      path: lorePath,
    });
  } else if (payload.domain === ChronologyDomainKind.WORLD_ADVANCE) {
    links.push({
      hrefKind: 'world_advance_batch',
      path: asPublicPagePath(`/campaigns/${slug}/world-advance/batches/${anchor.sourceEntityId}`),
    });
  } else if (payload.domain === ChronologyDomainKind.DOWNTIME_PERIOD) {
    links.push({
      hrefKind: 'downtime_hub',
      path: asPublicPagePath(`/campaigns/${slug}/downtime`),
    });
  }

  return links;
}

function sessionLinkFromWorldEvent(
  sourceEventIds: string[],
  sessionTimelinePointIds: Set<string>,
): { timelinePointId: string; sequenceOrder: number } | null {
  for (const eventId of sourceEventIds) {
    if (sessionTimelinePointIds.has(eventId)) {
      return { timelinePointId: eventId, sequenceOrder: 0 };
    }
  }
  return null;
}

export function buildConvergenceEntry(
  anchor: CanonicalChronologyAnchor,
  ctx: NarrativeViewerContext,
  linkCtx: CampaignLinkContext,
  presenceMap: Map<string, ContentRevelationState>,
  options?: {
    sessionTimelinePointIds?: Set<string>;
    sessionSequenceByPointId?: Map<string, number>;
  },
): ConvergenceTimelineEntry {
  let visible = true;
  let visibilityTier: NarrativeVisibilityTierValue = NarrativeVisibilityTier.PUBLIC;
  let revelationState: ContentRevelationState | null = null;
  let suppressReason: string | null = null;

  const payload = anchor.domainPayload;

  if (payload.domain === ChronologyDomainKind.WORLD_EVENT) {
    const proj = projectTimelineEventVisibility(
      payload.payload.baseEventId,
      payload.payload.visibility,
      presenceMap,
      ctx,
    );
    visible = isTimelineEventVisible(proj);
    visibilityTier = proj.role.tier;
    revelationState = proj.revelation.presenceState;
    if (!visible) {
      suppressReason = proj.revelation.denyReason ?? proj.role.denyReason ?? 'hidden';
    }
  } else if (payload.domain === ChronologyDomainKind.SESSION_CHRONICLE) {
    const presence = resolvePresenceState(presenceMap, anchor.sourceEntityId);
    const rev = projectRevelation(presence, ctx);
    visible = rev.visible;
    revelationState = rev.presenceState;
    visibilityTier = NarrativeVisibilityTier.PARTY;
    if (!visible) suppressReason = rev.denyReason ?? 'unrevealed';
  } else if (payload.domain === ChronologyDomainKind.MAP_KEYFRAME) {
    const presence = resolvePresenceState(presenceMap, anchor.sourceEntityId);
    const rev = projectRevelation(presence, ctx);
    visible = rev.visible;
    revelationState = rev.presenceState;
    visibilityTier = NarrativeVisibilityTier.PARTY;
    if (!visible) suppressReason = rev.denyReason ?? 'unrevealed';
  } else if (payload.domain === ChronologyDomainKind.ORG_RELATION) {
    const rel = projectEntityRelation(payload.payload.visibility, ctx);
    visible = rel.visible;
    visibilityTier = rel.role.tier;
    if (!visible) suppressReason = rel.role.denyReason ?? 'role_elevated_only';
  } else if (payload.domain === ChronologyDomainKind.LORE_REFERENCE) {
    visible = ctx.perspective === 'elevated' || true;
    visibilityTier = NarrativeVisibilityTier.PARTY;
    revelationState = ContentRevelationStates.REVEALED;
  } else if (payload.domain === ChronologyDomainKind.DOWNTIME_PERIOD) {
    visible = true;
    visibilityTier = NarrativeVisibilityTier.PARTY;
    revelationState = ContentRevelationStates.REVEALED;
  }

  let sessionLink = anchor.sessionLink;
  if (
    payload.domain === ChronologyDomainKind.WORLD_EVENT &&
    options?.sessionTimelinePointIds
  ) {
    const baseIds = [payload.payload.baseEventId];
    const linked = sessionLinkFromWorldEvent(
      baseIds,
      options.sessionTimelinePointIds,
    );
    if (linked && options.sessionSequenceByPointId) {
      sessionLink = {
        timelinePointId: linked.timelinePointId,
        sequenceOrder:
          options.sessionSequenceByPointId.get(linked.timelinePointId) ?? 0,
      };
    }
  }
  if (
    payload.domain === ChronologyDomainKind.ORG_RELATION &&
    options?.sessionTimelinePointIds
  ) {
    const linked = sessionLinkFromWorldEvent(
      payload.payload.sourceEventIds,
      options.sessionTimelinePointIds,
    );
    if (linked && options.sessionSequenceByPointId) {
      sessionLink = {
        timelinePointId: linked.timelinePointId,
        sequenceOrder:
          options.sessionSequenceByPointId.get(linked.timelinePointId) ?? 0,
      };
    }
  }

  const dateLabel =
    anchor.range != null
      ? formatChronologyRangeDateLabel(anchor.range)
      : formatChronologyDateLabel(anchor.instant);

  return {
    entryId: anchor.id,
    sortOrdinal: buildChronologySortOrdinal(anchor),
    instant: anchor.instant,
    display: {
      title: formatConvergenceFeedTitle(anchor.title),
      summary: anchor.summary,
      dateLabel,
    },
    source: {
      domain: anchor.domain,
      entityType: anchor.sourceEntityType,
      entityId: anchor.sourceEntityId,
      subEntityId: anchor.subEntityId,
      collectorVersion: CONVERGENCE_COLLECTOR_VERSION,
      collectedFrom: anchor.domain,
    },
    domain: anchor.domain,
    domainPayload: anchor.domainPayload,
    projection: {
      visible,
      visibilityTier,
      revelationState,
      temporalMode: TemporalHistoricalMode.PRESENT_ONLY,
      suppressReason,
    },
    links: buildCampaignLinks(anchor, linkCtx),
    sessionLink,
  };
}

export function mergeAndSortEntries(
  entries: ConvergenceTimelineEntry[],
): ConvergenceTimelineEntry[] {
  return [...entries].sort((a, b) => {
    if (a.sortOrdinal < b.sortOrdinal) return -1;
    if (a.sortOrdinal > b.sortOrdinal) return 1;
    if (a.entryId < b.entryId) return -1;
    if (a.entryId > b.entryId) return 1;
    return 0;
  });
}

export function filterEntriesForViewer(
  entries: ConvergenceTimelineEntry[],
  includeSuppressed: boolean,
): ConvergenceTimelineEntry[] {
  if (includeSuppressed) return entries;
  return entries.filter((e) => e.projection.visible);
}

export function filterEntriesByDomains(
  entries: ConvergenceTimelineEntry[],
  domains: ChronologyDomainKindValue[] | null,
): ConvergenceTimelineEntry[] {
  if (!domains || domains.length === 0) return entries;
  const set = new Set(domains);
  return entries.filter((e) => set.has(e.domain));
}

export function filterEntriesSessionLinkedOnly(
  entries: ConvergenceTimelineEntry[],
): ConvergenceTimelineEntry[] {
  return entries.filter(
    (e) =>
      e.domain === ChronologyDomainKind.SESSION_CHRONICLE || e.sessionLink !== null,
  );
}

export function filterEntriesByWindow(
  entries: ConvergenceTimelineEntry[],
  window: ChronologyWindowQuery,
): ConvergenceTimelineEntry[] {
  return entries.filter((e) => instantMatchesWindow(e.instant, window));
}

export function capConvergenceEntries(
  entries: ConvergenceTimelineEntry[],
  max = CONVERGENCE_MAX_ENTRIES,
): { entries: ConvergenceTimelineEntry[]; totalCollected: number; capped: boolean } {
  const totalCollected = entries.length;
  if (entries.length <= max) {
    return { entries, totalCollected, capped: false };
  }
  return { entries: entries.slice(0, max), totalCollected, capped: true };
}

export function parseDomainsQuery(
  raw: string | undefined,
): ChronologyDomainKindValue[] | null {
  if (!raw?.trim()) return null;
  const values = Object.values(ChronologyDomainKind);
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is ChronologyDomainKindValue =>
      (values as string[]).includes(s),
    );
  return parsed.length > 0 ? parsed : null;
}
