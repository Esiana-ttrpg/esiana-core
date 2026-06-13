"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONVERGENCE_MAX_ENTRIES = exports.CONVERGENCE_COLLECTOR_VERSION = exports.CONVERGENCE_BUNDLE_VERSION = void 0;
exports.buildProjectionContextHash = buildProjectionContextHash;
exports.buildCampaignLinks = buildCampaignLinks;
exports.buildConvergenceEntry = buildConvergenceEntry;
exports.mergeAndSortEntries = mergeAndSortEntries;
exports.filterEntriesForViewer = filterEntriesForViewer;
exports.filterEntriesByDomains = filterEntriesByDomains;
exports.filterEntriesSessionLinkedOnly = filterEntriesSessionLinkedOnly;
exports.filterEntriesByWindow = filterEntriesByWindow;
exports.capConvergenceEntries = capConvergenceEntries;
exports.parseDomainsQuery = parseDomainsQuery;
/**
 * Layer 1 — cross-domain chronology convergence (serializable feed primitive).
 */
const contentPresence_js_1 = require("./contentPresence.js");
const chronologyTypes_js_1 = require("./chronologyTypes.js");
const convergenceFeedDisplay_js_1 = require("./convergenceFeedDisplay.js");
const publicPagePath_js_1 = require("./publicPagePath.js");
const narrativeProjection_js_1 = require("./narrativeProjection.js");
exports.CONVERGENCE_BUNDLE_VERSION = 'convergence-v1';
exports.CONVERGENCE_COLLECTOR_VERSION = '1';
exports.CONVERGENCE_MAX_ENTRIES = 2000;
function buildProjectionContextHash(ctx) {
    const epoch = ctx.campaignNow.epochMinute.toString();
    return `${ctx.perspective}:${ctx.role ?? 'none'}:${epoch}`;
}
function buildCampaignLinks(anchor, linkCtx) {
    const slug = linkCtx.campaignHandle;
    const links = [];
    const payload = anchor.domainPayload;
    if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.WORLD_EVENT) {
        links.push({
            hrefKind: 'event_lore',
            path: (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/event-${payload.payload.baseEventId}`),
        });
        links.push({
            hrefKind: 'chronology_events',
            path: (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/chronology?view=events`),
        });
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.SESSION_CHRONICLE) {
        links.push({
            hrefKind: 'session_note',
            path: (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/notes/${payload.payload.timelinePointId}`),
        });
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.MAP_KEYFRAME) {
        const q = new URLSearchParams({
            viewEpochMinute: payload.payload.effectiveEpochMinute,
        });
        links.push({
            hrefKind: 'map_scene',
            path: (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/maps/${payload.payload.mapId}?${q.toString()}`),
        });
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.ORG_RELATION) {
        const orgPath = linkCtx.resolveWikiPagePath?.(payload.payload.orgPageId) ??
            (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/dashboard`);
        links.push({
            hrefKind: 'wiki_page',
            path: orgPath,
        });
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.LORE_REFERENCE) {
        const lorePath = linkCtx.resolveWikiPagePath?.(payload.payload.pageId) ??
            (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/dashboard`);
        links.push({
            hrefKind: 'wiki_page',
            path: lorePath,
        });
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.WORLD_ADVANCE) {
        links.push({
            hrefKind: 'world_advance_batch',
            path: (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/world-advance/batches/${anchor.sourceEntityId}`),
        });
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.DOWNTIME_PERIOD) {
        links.push({
            hrefKind: 'downtime_hub',
            path: (0, publicPagePath_js_1.asPublicPagePath)(`/campaigns/${slug}/downtime`),
        });
    }
    return links;
}
function sessionLinkFromWorldEvent(sourceEventIds, sessionTimelinePointIds) {
    for (const eventId of sourceEventIds) {
        if (sessionTimelinePointIds.has(eventId)) {
            return { timelinePointId: eventId, sequenceOrder: 0 };
        }
    }
    return null;
}
function buildConvergenceEntry(anchor, ctx, linkCtx, presenceMap, options) {
    let visible = true;
    let visibilityTier = narrativeProjection_js_1.NarrativeVisibilityTier.PUBLIC;
    let revelationState = null;
    let suppressReason = null;
    const payload = anchor.domainPayload;
    if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.WORLD_EVENT) {
        const proj = (0, narrativeProjection_js_1.projectTimelineEventVisibility)(payload.payload.baseEventId, payload.payload.visibility, presenceMap, ctx);
        visible = (0, narrativeProjection_js_1.isTimelineEventVisible)(proj);
        visibilityTier = proj.role.tier;
        revelationState = proj.revelation.presenceState;
        if (!visible) {
            suppressReason = proj.revelation.denyReason ?? proj.role.denyReason ?? 'hidden';
        }
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.SESSION_CHRONICLE) {
        const presence = (0, narrativeProjection_js_1.resolvePresenceState)(presenceMap, anchor.sourceEntityId);
        const rev = (0, narrativeProjection_js_1.projectRevelation)(presence, ctx);
        visible = rev.visible;
        revelationState = rev.presenceState;
        visibilityTier = narrativeProjection_js_1.NarrativeVisibilityTier.PARTY;
        if (!visible)
            suppressReason = rev.denyReason ?? 'unrevealed';
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.MAP_KEYFRAME) {
        const presence = (0, narrativeProjection_js_1.resolvePresenceState)(presenceMap, anchor.sourceEntityId);
        const rev = (0, narrativeProjection_js_1.projectRevelation)(presence, ctx);
        visible = rev.visible;
        revelationState = rev.presenceState;
        visibilityTier = narrativeProjection_js_1.NarrativeVisibilityTier.PARTY;
        if (!visible)
            suppressReason = rev.denyReason ?? 'unrevealed';
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.ORG_RELATION) {
        const rel = (0, narrativeProjection_js_1.projectEntityRelation)(payload.payload.visibility, ctx);
        visible = rel.visible;
        visibilityTier = rel.role.tier;
        if (!visible)
            suppressReason = rel.role.denyReason ?? 'role_elevated_only';
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.LORE_REFERENCE) {
        visible = ctx.perspective === 'elevated' || true;
        visibilityTier = narrativeProjection_js_1.NarrativeVisibilityTier.PARTY;
        revelationState = contentPresence_js_1.ContentRevelationStates.REVEALED;
    }
    else if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.DOWNTIME_PERIOD) {
        visible = true;
        visibilityTier = narrativeProjection_js_1.NarrativeVisibilityTier.PARTY;
        revelationState = contentPresence_js_1.ContentRevelationStates.REVEALED;
    }
    let sessionLink = anchor.sessionLink;
    if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.WORLD_EVENT &&
        options?.sessionTimelinePointIds) {
        const baseIds = [payload.payload.baseEventId];
        const linked = sessionLinkFromWorldEvent(baseIds, options.sessionTimelinePointIds);
        if (linked && options.sessionSequenceByPointId) {
            sessionLink = {
                timelinePointId: linked.timelinePointId,
                sequenceOrder: options.sessionSequenceByPointId.get(linked.timelinePointId) ?? 0,
            };
        }
    }
    if (payload.domain === chronologyTypes_js_1.ChronologyDomainKind.ORG_RELATION &&
        options?.sessionTimelinePointIds) {
        const linked = sessionLinkFromWorldEvent(payload.payload.sourceEventIds, options.sessionTimelinePointIds);
        if (linked && options.sessionSequenceByPointId) {
            sessionLink = {
                timelinePointId: linked.timelinePointId,
                sequenceOrder: options.sessionSequenceByPointId.get(linked.timelinePointId) ?? 0,
            };
        }
    }
    const dateLabel = anchor.range != null
        ? (0, chronologyTypes_js_1.formatChronologyRangeDateLabel)(anchor.range)
        : (0, chronologyTypes_js_1.formatChronologyDateLabel)(anchor.instant);
    return {
        entryId: anchor.id,
        sortOrdinal: (0, chronologyTypes_js_1.buildChronologySortOrdinal)(anchor),
        instant: anchor.instant,
        display: {
            title: (0, convergenceFeedDisplay_js_1.formatConvergenceFeedTitle)(anchor.title),
            summary: anchor.summary,
            dateLabel,
        },
        source: {
            domain: anchor.domain,
            entityType: anchor.sourceEntityType,
            entityId: anchor.sourceEntityId,
            subEntityId: anchor.subEntityId,
            collectorVersion: exports.CONVERGENCE_COLLECTOR_VERSION,
            collectedFrom: anchor.domain,
        },
        domain: anchor.domain,
        domainPayload: anchor.domainPayload,
        projection: {
            visible,
            visibilityTier,
            revelationState,
            temporalMode: narrativeProjection_js_1.TemporalHistoricalMode.PRESENT_ONLY,
            suppressReason,
        },
        links: buildCampaignLinks(anchor, linkCtx),
        sessionLink,
    };
}
function mergeAndSortEntries(entries) {
    return [...entries].sort((a, b) => {
        if (a.sortOrdinal < b.sortOrdinal)
            return -1;
        if (a.sortOrdinal > b.sortOrdinal)
            return 1;
        if (a.entryId < b.entryId)
            return -1;
        if (a.entryId > b.entryId)
            return 1;
        return 0;
    });
}
function filterEntriesForViewer(entries, includeSuppressed) {
    if (includeSuppressed)
        return entries;
    return entries.filter((e) => e.projection.visible);
}
function filterEntriesByDomains(entries, domains) {
    if (!domains || domains.length === 0)
        return entries;
    const set = new Set(domains);
    return entries.filter((e) => set.has(e.domain));
}
function filterEntriesSessionLinkedOnly(entries) {
    return entries.filter((e) => e.domain === chronologyTypes_js_1.ChronologyDomainKind.SESSION_CHRONICLE || e.sessionLink !== null);
}
function filterEntriesByWindow(entries, window) {
    return entries.filter((e) => (0, chronologyTypes_js_1.instantMatchesWindow)(e.instant, window));
}
function capConvergenceEntries(entries, max = exports.CONVERGENCE_MAX_ENTRIES) {
    const totalCollected = entries.length;
    if (entries.length <= max) {
        return { entries, totalCollected, capped: false };
    }
    return { entries: entries.slice(0, max), totalCollected, capped: true };
}
function parseDomainsQuery(raw) {
    if (!raw?.trim())
        return null;
    const values = Object.values(chronologyTypes_js_1.ChronologyDomainKind);
    const parsed = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => values.includes(s));
    return parsed.length > 0 ? parsed : null;
}
//# sourceMappingURL=chronologyConvergence.js.map