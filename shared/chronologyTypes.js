"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHRONOLOGY_DOMAIN_SORT_RANK = exports.ChronologyDomainKind = exports.ChronologySourceEntityType = void 0;
exports.normalizeChronologyDateParts = normalizeChronologyDateParts;
exports.chronologyInstantFromParts = chronologyInstantFromParts;
exports.chronologyInstantKey = chronologyInstantKey;
exports.dateSortKey = dateSortKey;
exports.compareChronologyDateParts = compareChronologyDateParts;
exports.chronologyInstantSortKey = chronologyInstantSortKey;
exports.compareChronologyInstants = compareChronologyInstants;
exports.formatChronologyDateLabel = formatChronologyDateLabel;
exports.formatChronologyRangeDateLabel = formatChronologyRangeDateLabel;
exports.buildChronologyEntryId = buildChronologyEntryId;
exports.anchorFromTimelineOccurrence = anchorFromTimelineOccurrence;
exports.anchorFromSessionTimelinePoint = anchorFromSessionTimelinePoint;
exports.anchorFromMapKeyframe = anchorFromMapKeyframe;
exports.anchorFromHistoricalAlias = anchorFromHistoricalAlias;
exports.anchorFromOrgRelationEvent = anchorFromOrgRelationEvent;
exports.anchorFromFactionControl = anchorFromFactionControl;
exports.anchorFromWorldAdvanceEffect = anchorFromWorldAdvanceEffect;
exports.buildDowntimePeriodGapId = buildDowntimePeriodGapId;
exports.anchorFromDowntimePeriod = anchorFromDowntimePeriod;
exports.buildSessionSortOrdinal = buildSessionSortOrdinal;
exports.buildChronologySortOrdinal = buildChronologySortOrdinal;
exports.instantMatchesWindow = instantMatchesWindow;
const convergenceFeedDisplay_js_1 = require("./convergenceFeedDisplay.js");
/** Values align with `ContentPresenceEntityType` in contentPresence.ts (no import — avoids Vite CJS .js emit). */
exports.ChronologySourceEntityType = {
    TIMELINE_EVENT: 'timeline_event',
    SESSION_NOTE: 'session_note',
    MAP_OBJECT: 'map_object',
    HISTORICAL_ALIAS: 'historical_alias',
    WIKI_PAGE: 'wiki_page',
};
var chronologyDomainKinds_js_1 = require("./chronologyDomainKinds.js");
Object.defineProperty(exports, "ChronologyDomainKind", { enumerable: true, get: function () { return chronologyDomainKinds_js_1.ChronologyDomainKind; } });
const chronologyDomainKinds_js_2 = require("./chronologyDomainKinds.js");
/** Sort priority when epoch ties (lower first). */
exports.CHRONOLOGY_DOMAIN_SORT_RANK = {
    [chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_EVENT]: 0,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.SESSION_CHRONICLE]: 1,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.DOWNTIME_PERIOD]: 2,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.ORG_RELATION]: 3,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.MAP_KEYFRAME]: 4,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.LORE_REFERENCE]: 5,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.QUEST_TRANSITION]: 6,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.FACTION_CONTROL]: 7,
    [chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_ADVANCE]: 8,
};
function normalizeChronologyDateParts(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const parseIntField = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.floor(value);
        }
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed))
                return parsed;
        }
        return null;
    };
    const year = parseIntField(obj.year);
    const month = parseIntField(obj.month);
    const day = parseIntField(obj.day);
    if (year === null && month === null && day === null)
        return null;
    return { year, month, day };
}
function chronologyInstantFromParts(parts, epochMinute) {
    const epoch = epochMinute === null || epochMinute === undefined
        ? null
        : String(epochMinute);
    return {
        epochMinute: epoch && epoch.trim() ? epoch : null,
        dateParts: parts,
    };
}
function chronologyInstantKey(instant) {
    if (instant.epochMinute?.trim()) {
        return `e:${instant.epochMinute.trim()}`;
    }
    const p = instant.dateParts;
    if (p && (p.year !== null || p.month !== null || p.day !== null)) {
        return `d:${p.year ?? ''}:${p.month ?? ''}:${p.day ?? ''}`;
    }
    return 'u:unknown';
}
function dateSortKey(parts) {
    const year = parts.year ?? 0;
    const month = parts.month ?? 0;
    const day = parts.day ?? 0;
    return year * 10000 + month * 100 + day;
}
function compareChronologyDateParts(a, b) {
    const ay = a.year ?? Number.NEGATIVE_INFINITY;
    const by = b.year ?? Number.NEGATIVE_INFINITY;
    if (ay !== by)
        return ay < by ? -1 : 1;
    const am = a.month ?? -1;
    const bm = b.month ?? -1;
    if (am !== bm)
        return am < bm ? -1 : 1;
    const ad = a.day ?? -1;
    const bd = b.day ?? -1;
    if (ad !== bd)
        return ad < bd ? -1 : 1;
    return 0;
}
function chronologyInstantSortKey(instant) {
    if (instant.epochMinute?.trim()) {
        try {
            return BigInt(instant.epochMinute.trim());
        }
        catch {
            return 0n;
        }
    }
    const p = instant.dateParts;
    if (p) {
        const y = BigInt(p.year ?? 0);
        const m = BigInt(p.month ?? 0);
        const d = BigInt(p.day ?? 0);
        return y * 1000000n + m * 1000n + d;
    }
    return 0n;
}
function compareChronologyInstants(a, b) {
    const ak = chronologyInstantSortKey(a);
    const bk = chronologyInstantSortKey(b);
    if (ak < bk)
        return -1;
    if (ak > bk)
        return 1;
    return 0;
}
function formatChronologyDateLabel(instant) {
    const p = instant.dateParts;
    if (!p)
        return null;
    const y = p.year ?? '?';
    const m = p.month !== null ? String(p.month + 1) : '?';
    const d = p.day ?? '?';
    return `${y}-${m}-${d}`;
}
function formatChronologyRangeDateLabel(range) {
    const startLabel = formatChronologyDateLabel(range.start);
    const endLabel = range.end ? formatChronologyDateLabel(range.end) : null;
    if (startLabel && endLabel) {
        if (startLabel === endLabel)
            return startLabel;
        return `${startLabel} – ${endLabel}`;
    }
    return startLabel ?? endLabel ?? null;
}
function buildChronologyEntryId(input) {
    const sub = input.subEntityId?.trim() ?? '';
    return `${input.domain}:${input.sourceEntityType}:${input.sourceEntityId}:${sub}:${chronologyInstantKey(input.instant)}`;
}
function anchorFromTimelineOccurrence(row) {
    const instant = chronologyInstantFromParts({
        year: row.start.year,
        month: row.start.month,
        day: row.start.day,
    }, row.start.epochMinute);
    const sourceEntityType = exports.ChronologySourceEntityType.TIMELINE_EVENT;
    const sourceEntityId = row.baseEventId;
    const subEntityId = row.occurrenceId;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_EVENT,
            sourceEntityType,
            sourceEntityId,
            subEntityId,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_EVENT,
        sourceEntityType,
        sourceEntityId,
        subEntityId,
        instant,
        title: row.title,
        summary: (0, convergenceFeedDisplay_js_1.formatWorldEventFeedSummary)(row.description),
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_EVENT,
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
function anchorFromSessionTimelinePoint(row) {
    const instant = chronologyInstantFromParts(null, row.fantasyEpochMinute);
    const sourceEntityType = exports.ChronologySourceEntityType.SESSION_NOTE;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.SESSION_CHRONICLE,
            sourceEntityType,
            sourceEntityId: row.timelinePointId,
            subEntityId: row.wikiPageId,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.SESSION_CHRONICLE,
        sourceEntityType,
        sourceEntityId: row.timelinePointId,
        subEntityId: row.wikiPageId,
        instant,
        title: row.title,
        summary: row.summary,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.SESSION_CHRONICLE,
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
function anchorFromMapKeyframe(row) {
    const epoch = String(row.effectiveEpochMinute);
    const instant = chronologyInstantFromParts(null, epoch);
    const sourceEntityType = exports.ChronologySourceEntityType.MAP_OBJECT;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.MAP_KEYFRAME,
            sourceEntityType,
            sourceEntityId: row.sceneObjectId,
            subEntityId: row.keyframeId,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.MAP_KEYFRAME,
        sourceEntityType,
        sourceEntityId: row.sceneObjectId,
        subEntityId: row.keyframeId,
        instant,
        title: row.objectLabel
            ? `${row.objectLabel} — map state`
            : 'Map object state change',
        summary: null,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.MAP_KEYFRAME,
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
function anchorFromHistoricalAlias(alias, pageTitle, bound) {
    const parts = bound === 'era_start' ? alias.eraStart : alias.eraEnd;
    if (!parts)
        return null;
    const instant = chronologyInstantFromParts(parts, null);
    const sourceEntityType = exports.ChronologySourceEntityType.HISTORICAL_ALIAS;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.LORE_REFERENCE,
            sourceEntityType,
            sourceEntityId: alias.pageId,
            subEntityId: `${alias.stableKey}:${bound}`,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.LORE_REFERENCE,
        sourceEntityType,
        sourceEntityId: alias.pageId,
        subEntityId: `${alias.stableKey}:${bound}`,
        instant,
        title: `${alias.name} (${bound === 'era_start' ? 'era start' : 'era end'})`,
        summary: pageTitle,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.LORE_REFERENCE,
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
function anchorFromOrgRelationEvent(row) {
    const instant = chronologyInstantFromParts(row.effectiveDate, null);
    const sourceEntityType = exports.ChronologySourceEntityType.WIKI_PAGE;
    const title = `${row.stance} — ${row.relationType}`;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.ORG_RELATION,
            sourceEntityType,
            sourceEntityId: row.orgPageId,
            subEntityId: row.eventId,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.ORG_RELATION,
        sourceEntityType,
        sourceEntityId: row.orgPageId,
        subEntityId: row.eventId,
        instant,
        title,
        summary: row.note,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.ORG_RELATION,
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
function anchorFromFactionControl(row) {
    const epoch = String(row.effectiveEpochMinute);
    const instant = chronologyInstantFromParts(null, epoch);
    const sourceEntityType = exports.ChronologySourceEntityType.MAP_OBJECT;
    const title = row.objectLabel
        ? `${row.controlKind} — ${row.objectLabel}`
        : `Territory ${row.controlKind}`;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.FACTION_CONTROL,
            sourceEntityType,
            sourceEntityId: row.sceneObjectId,
            subEntityId: `${row.controlKind}:${epoch}`,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.FACTION_CONTROL,
        sourceEntityType,
        sourceEntityId: row.sceneObjectId,
        subEntityId: `${row.controlKind}:${epoch}`,
        instant,
        title,
        summary: row.orgPageId ? `Org ${row.orgPageId}` : null,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.FACTION_CONTROL,
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
function anchorFromWorldAdvanceEffect(row) {
    const epoch = String(row.targetEpochMinute);
    const instant = chronologyInstantFromParts(null, epoch);
    const sourceEntityType = exports.ChronologySourceEntityType.TIMELINE_EVENT;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_ADVANCE,
            sourceEntityType,
            sourceEntityId: row.chronologyEventId,
            subEntityId: row.effectId,
            instant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_ADVANCE,
        sourceEntityType,
        sourceEntityId: row.chronologyEventId,
        subEntityId: row.effectId,
        instant,
        title: row.summary,
        summary: row.synthesisHeadline ?? `Batch ${row.batchId}`,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.WORLD_ADVANCE,
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
function buildDowntimePeriodGapId(startEpochMinute, endEpochMinute) {
    return `gap:${startEpochMinute}:${endEpochMinute}`;
}
function anchorFromDowntimePeriod(row) {
    const startInstant = chronologyInstantFromParts(row.startDateParts, row.startEpochMinute);
    const endInstant = chronologyInstantFromParts(row.endDateParts, row.endEpochMinute);
    const sourceEntityType = exports.ChronologySourceEntityType.TIMELINE_EVENT;
    const sessionLink = row.sessionBeforeId != null
        ? {
            timelinePointId: row.sessionBeforeId,
            sequenceOrder: row.sessionBeforeSequenceOrder ?? 0,
        }
        : null;
    return {
        id: buildChronologyEntryId({
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.DOWNTIME_PERIOD,
            sourceEntityType,
            sourceEntityId: row.gapId,
            subEntityId: null,
            instant: startInstant,
        }),
        domain: chronologyDomainKinds_js_2.ChronologyDomainKind.DOWNTIME_PERIOD,
        sourceEntityType,
        sourceEntityId: row.gapId,
        subEntityId: null,
        instant: startInstant,
        range: { start: startInstant, end: endInstant },
        title: row.promotedLabel?.trim() || row.title,
        summary: row.summary ?? row.rollupHeadline,
        domainPayload: {
            domain: chronologyDomainKinds_js_2.ChronologyDomainKind.DOWNTIME_PERIOD,
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
function buildSessionSortOrdinal(sequenceOrder) {
    const paddedSeq = String(sequenceOrder).padStart(8, '0');
    return `000000000000000:${paddedSeq}`;
}
function buildChronologySortOrdinal(anchor) {
    const epochKey = chronologyInstantSortKey(anchor.instant);
    const epochPadded = epochKey.toString().padStart(20, '0');
    if (epochKey === 0n &&
        anchor.domain === chronologyDomainKinds_js_2.ChronologyDomainKind.SESSION_CHRONICLE &&
        anchor.domainPayload.domain === chronologyDomainKinds_js_2.ChronologyDomainKind.SESSION_CHRONICLE) {
        return buildSessionSortOrdinal(anchor.domainPayload.payload.sequenceOrder);
    }
    const domainRank = String(exports.CHRONOLOGY_DOMAIN_SORT_RANK[anchor.domain]).padStart(2, '0');
    const entity = anchor.sourceEntityId.padStart(32, '0').slice(0, 32);
    const sub = (anchor.subEntityId ?? '').padStart(32, '0').slice(0, 32);
    return `${epochPadded}:${domainRank}:${entity}:${sub}`;
}
function instantMatchesWindow(instant, window) {
    const mode = window.mode.toUpperCase();
    if (mode === 'EPOCH_RANGE') {
        const epoch = chronologyInstantSortKey(instant);
        let from = 0n;
        let to = BigInt('999999999999999999');
        try {
            from = BigInt(window.from);
        }
        catch {
            /* keep default */
        }
        try {
            to = BigInt(window.to);
        }
        catch {
            /* keep default */
        }
        if (epoch === 0n)
            return true;
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
    if (instant.epochMinute)
        return true;
    return true;
}
//# sourceMappingURL=chronologyTypes.js.map