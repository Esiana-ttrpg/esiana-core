"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_IMPACT_TEMPLATE_CARDS = exports.HAVEN_THREAT_SEVERITY_GM_LABELS = exports.ROUTE_CHANGE_REASON_GM_LABELS = exports.ROUTE_CHANGE_SEVERITY_GM_LABELS = exports.EVENT_CONSEQUENCE_APPLICATION_GM_LABELS = exports.EVENT_CONSEQUENCE_KIND_SENTENCE_LABELS = exports.EVENT_CONSEQUENCE_KIND_GM_LABELS = void 0;
exports.collectConsequencePageIds = collectConsequencePageIds;
exports.collectApplyResultPageIds = collectApplyResultPageIds;
exports.formatConsequenceCardTitle = formatConsequenceCardTitle;
exports.formatConsequenceSentenceLabel = formatConsequenceSentenceLabel;
exports.formatApplicationStateLabel = formatApplicationStateLabel;
exports.formatConsequenceDetailLine = formatConsequenceDetailLine;
exports.formatConsequenceFeedSummary = formatConsequenceFeedSummary;
exports.shouldShowApplyCountHeadline = shouldShowApplyCountHeadline;
exports.formatApplyResultHeadline = formatApplyResultHeadline;
exports.formatPreviewRows = formatPreviewRows;
exports.formatPendingConfirmation = formatPendingConfirmation;
exports.EVENT_CONSEQUENCE_KIND_GM_LABELS = {
    quest_hook: 'Opportunity appears',
    alter_location: 'Location changes',
    route_change: 'Travel disruption',
    haven_threat: 'Haven threatened',
};
exports.EVENT_CONSEQUENCE_KIND_SENTENCE_LABELS = {
    quest_hook: 'Quest or lead appears',
    alter_location: 'A place changes',
    route_change: 'Travel disruption',
    haven_threat: 'A haven faces trouble',
};
exports.EVENT_CONSEQUENCE_APPLICATION_GM_LABELS = {
    pending: 'Not yet applied',
    complete: 'Applied',
    partial: 'Needs review',
    blocked: 'Could not apply',
};
exports.ROUTE_CHANGE_SEVERITY_GM_LABELS = {
    minor: 'Minor disruption',
    major: 'Major disruption',
};
exports.ROUTE_CHANGE_REASON_GM_LABELS = {
    war: 'War',
    banditry: 'Banditry',
    disaster: 'Disaster',
    other: 'Other',
};
exports.HAVEN_THREAT_SEVERITY_GM_LABELS = {
    low: 'Low',
    rising: 'Rising',
    critical: 'Critical',
};
function resolvePageTitle(lookup, pageId) {
    if (!pageId)
        return null;
    if (lookup instanceof Map) {
        return lookup.get(pageId) ?? null;
    }
    return lookup[pageId] ?? null;
}
function quoteTitle(title) {
    return `"${title}"`;
}
function collectConsequencePageIds(row) {
    const ids = new Set();
    for (const id of row.targets?.pageIds ?? []) {
        if (id.trim())
            ids.add(id.trim());
    }
    for (const id of row.targets?.locationIds ?? []) {
        if (id.trim())
            ids.add(id.trim());
    }
    for (const id of row.targets?.havenIds ?? []) {
        if (id.trim())
            ids.add(id.trim());
    }
    return [...ids];
}
function collectApplyResultPageIds(consequences, previewRows) {
    const ids = new Set();
    for (const row of consequences) {
        for (const id of collectConsequencePageIds(row)) {
            ids.add(id);
        }
    }
    return [...ids];
}
function formatConsequenceCardTitle(row) {
    return exports.EVENT_CONSEQUENCE_KIND_GM_LABELS[row.kind];
}
function formatConsequenceSentenceLabel(row) {
    return exports.EVENT_CONSEQUENCE_KIND_SENTENCE_LABELS[row.kind];
}
function formatApplicationStateLabel(state) {
    if (!state)
        return exports.EVENT_CONSEQUENCE_APPLICATION_GM_LABELS.pending;
    return exports.EVENT_CONSEQUENCE_APPLICATION_GM_LABELS[state];
}
function formatConsequenceDetailLine(row, titles, options) {
    const projectedState = options?.projectedState;
    const blocked = projectedState === 'blocked';
    switch (row.kind) {
        case 'quest_hook': {
            const pageId = row.targets?.pageIds?.[0];
            const title = resolvePageTitle(titles, pageId) ?? pageId ?? 'the linked page';
            const payload = row.payload;
            if (blocked) {
                return pageId
                    ? `${quoteTitle(title)} could not be made discoverable — check the linked page.`
                    : 'Choose a quest or lead page before applying.';
            }
            if (payload.mode === 'discover_quest') {
                return `${quoteTitle(title)} is now discoverable to players.`;
            }
            return `${quoteTitle(title)} is now discoverable as a lead.`;
        }
        case 'alter_location': {
            const locationId = row.targets?.locationIds?.[0] ?? row.targets?.pageIds?.[0];
            const title = resolvePageTitle(titles, locationId) ?? locationId ?? 'the location';
            if (blocked) {
                return locationId
                    ? `${quoteTitle(title)} could not be updated — location not found.`
                    : 'Choose a location before applying.';
            }
            if (row.description?.trim()) {
                return `${quoteTitle(title)} changes: ${row.description.trim()}.`;
            }
            return `${quoteTitle(title)} is marked as changed after this event.`;
        }
        case 'route_change': {
            const locationIds = row.targets?.locationIds ?? [];
            const fromId = locationIds[0];
            const toId = locationIds[1];
            const fromTitle = resolvePageTitle(titles, fromId) ?? fromId ?? '…';
            const toTitle = resolvePageTitle(titles, toId) ?? toId ?? '…';
            const payload = row.payload;
            const severity = exports.ROUTE_CHANGE_SEVERITY_GM_LABELS[payload.severity ?? 'minor'] ?? 'Disruption';
            const reason = exports.ROUTE_CHANGE_REASON_GM_LABELS[payload.reason ?? 'other'] ?? 'Other';
            if (blocked) {
                if (!fromId || !toId) {
                    return 'Choose both ends of the route before applying.';
                }
                return `Travel between ${quoteTitle(fromTitle)} and ${quoteTitle(toTitle)} could not be projected on the current map.`;
            }
            if (row.description?.trim()) {
                return row.description.trim();
            }
            return `Travel between ${quoteTitle(fromTitle)} and ${quoteTitle(toTitle)} becomes dangerous (${severity.toLowerCase()}, ${reason.toLowerCase()}).`;
        }
        case 'haven_threat': {
            const havenId = row.targets?.havenIds?.[0];
            const havenTitle = resolvePageTitle(titles, havenId) ?? havenId ?? 'the haven';
            const payload = row.payload;
            const label = payload.label?.trim();
            if (blocked) {
                if (!havenId)
                    return 'Choose a haven before applying.';
                if (!label)
                    return 'Describe what is happening at the haven before applying.';
                return `${quoteTitle(havenTitle)} could not be updated — haven not found.`;
            }
            if (label) {
                return `${quoteTitle(havenTitle)}: ${label}.`;
            }
            return `${quoteTitle(havenTitle)} faces new trouble.`;
        }
        default:
            return row.description?.trim() || 'World impact recorded.';
    }
}
function formatConsequenceFeedSummary(row, titles) {
    const state = row.application?.state ?? 'pending';
    const detail = formatConsequenceDetailLine(row, titles);
    if (state === 'pending') {
        return detail;
    }
    const stateLabel = formatApplicationStateLabel(state);
    return `${detail} (${stateLabel})`;
}
function shouldShowApplyCountHeadline(result) {
    const rows = result.previewRows ?? [];
    if (rows.length >= 2)
        return true;
    if (rows.length === 0)
        return false;
    const hasApplied = result.appliedCount > 0;
    const hasPartial = result.partialCount > 0;
    const hasBlocked = result.blockedCount > 0;
    const outcomeKinds = [hasApplied, hasPartial, hasBlocked].filter(Boolean).length;
    return outcomeKinds >= 2;
}
function formatApplyResultHeadline(result) {
    if (!shouldShowApplyCountHeadline(result))
        return null;
    const parts = [];
    if (result.appliedCount > 0) {
        parts.push(`${result.appliedCount} change${result.appliedCount === 1 ? '' : 's'} applied`);
    }
    if (result.partialCount > 0) {
        parts.push(`${result.partialCount} need${result.partialCount === 1 ? 's' : ''} review`);
    }
    if (result.blockedCount > 0) {
        parts.push(`${result.blockedCount} could not be applied`);
    }
    return parts.join(' · ');
}
function formatPreviewRows(result, consequences, titles) {
    const byId = new Map(consequences.map((row) => [row.id, row]));
    const lines = [];
    for (const previewRow of result.previewRows ?? []) {
        const consequence = byId.get(previewRow.consequenceId);
        const text = consequence
            ? formatConsequenceDetailLine(consequence, titles, {
                projectedState: previewRow.projectedState,
            })
            : previewRow.summary;
        const tone = previewRow.projectedState === 'blocked'
            ? 'blocked'
            : previewRow.projectedState === 'partial' ||
                previewRow.pendingConfirmations.length > 0
                ? 'warning'
                : 'default';
        lines.push({ text, tone });
    }
    for (const confirmation of result.pendingConfirmations) {
        lines.push({
            text: formatPendingConfirmation(confirmation, titles),
            tone: 'warning',
        });
    }
    return lines;
}
function formatPendingConfirmation(line, titles) {
    const overlayMatch = line.match(/Trade route overlay ([^ ]+) projected \(DRAFT\) — confirm in map editor/i);
    if (overlayMatch) {
        return 'Confirm the new travel route on the map editor.';
    }
    if (/confirm in map editor/i.test(line)) {
        return 'Confirm the new travel route on the map editor after applying.';
    }
    if (/DRAFT/i.test(line) && /overlay/i.test(line)) {
        return 'A draft travel route will appear on the map — confirm it after applying.';
    }
    return line;
}
exports.WORLD_IMPACT_TEMPLATE_CARDS = [
    {
        kind: 'quest_hook',
        label: exports.EVENT_CONSEQUENCE_KIND_GM_LABELS.quest_hook,
        description: 'Players can discover a quest or lead',
    },
    {
        kind: 'alter_location',
        label: exports.EVENT_CONSEQUENCE_KIND_GM_LABELS.alter_location,
        description: 'A place is altered after the event',
    },
    {
        kind: 'route_change',
        label: exports.EVENT_CONSEQUENCE_KIND_GM_LABELS.route_change,
        description: 'A route becomes dangerous or blocked',
    },
    {
        kind: 'haven_threat',
        label: exports.EVENT_CONSEQUENCE_KIND_GM_LABELS.haven_threat,
        description: 'A haven faces new trouble',
    },
];
//# sourceMappingURL=eventConsequencePresentation.js.map