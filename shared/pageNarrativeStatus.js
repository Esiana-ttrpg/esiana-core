"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PAGE_NARRATIVE_STATUSES = exports.PageNarrativeStatuses = exports.PAGE_NARRATIVE_STATUS_SEMANTICS_VERSION = void 0;
exports.normalizePageNarrativeStatus = normalizePageNarrativeStatus;
exports.mapCharacterLifeStatusToNarrativeStatus = mapCharacterLifeStatusToNarrativeStatus;
exports.resolvePageNarrativeStatus = resolvePageNarrativeStatus;
exports.formatPageNarrativeStatusLabel = formatPageNarrativeStatusLabel;
exports.pageNarrativeStatusTone = pageNarrativeStatusTone;
exports.pageNarrativeStatusCssModifier = pageNarrativeStatusCssModifier;
exports.shouldShowPageNarrativeStatusBadge = shouldShowPageNarrativeStatusBadge;
exports.isPageNarrativeStatusVisibleToParty = isPageNarrativeStatusVisibleToParty;
exports.projectPageNarrativeStatus = projectPageNarrativeStatus;
exports.parseStatusSearchToken = parseStatusSearchToken;
exports.stripStatusSearchToken = stripStatusSearchToken;
exports.PAGE_NARRATIVE_STATUS_SEMANTICS_VERSION = 'page-narrative-status-v1';
/** Must stay in 1:1 sync with Prisma enum PageNarrativeStatusType */
exports.PageNarrativeStatuses = {
    ACTIVE: 'ACTIVE',
    MISSING: 'MISSING',
    DEAD: 'DEAD',
    ARCHIVED: 'ARCHIVED',
    RUMORED: 'RUMORED',
    RETIRED: 'RETIRED',
    HISTORICAL: 'HISTORICAL',
    LEGENDARY: 'LEGENDARY',
    SECRET: 'SECRET',
};
exports.ALL_PAGE_NARRATIVE_STATUSES = Object.values(exports.PageNarrativeStatuses);
const STATUS_SET = new Set(exports.ALL_PAGE_NARRATIVE_STATUSES);
function normalizePageNarrativeStatus(raw) {
    if (typeof raw !== 'string')
        return null;
    const upper = raw.trim().toUpperCase();
    if (!STATUS_SET.has(upper))
        return null;
    return upper;
}
function mapCharacterLifeStatusToNarrativeStatus(lifeStatus) {
    switch (lifeStatus) {
        case 'ALIVE':
            return exports.PageNarrativeStatuses.ACTIVE;
        case 'DECEASED':
            return exports.PageNarrativeStatuses.DEAD;
        case 'MISSING':
            return exports.PageNarrativeStatuses.MISSING;
        case 'EXILED':
            return exports.PageNarrativeStatuses.RETIRED;
        case 'UNKNOWN':
            return null;
        default:
            return null;
    }
}
function resolvePageNarrativeStatus(input) {
    if (input.storedStatus)
        return input.storedStatus;
    const mapped = input.characterLifeStatus
        ? mapCharacterLifeStatusToNarrativeStatus(input.characterLifeStatus)
        : null;
    return mapped ?? exports.PageNarrativeStatuses.ACTIVE;
}
function formatPageNarrativeStatusLabel(status) {
    switch (status) {
        case exports.PageNarrativeStatuses.ACTIVE:
            return 'Active';
        case exports.PageNarrativeStatuses.MISSING:
            return 'Missing';
        case exports.PageNarrativeStatuses.DEAD:
            return 'Dead';
        case exports.PageNarrativeStatuses.ARCHIVED:
            return 'Archived';
        case exports.PageNarrativeStatuses.RUMORED:
            return 'Rumored';
        case exports.PageNarrativeStatuses.RETIRED:
            return 'Retired';
        case exports.PageNarrativeStatuses.HISTORICAL:
            return 'Historical';
        case exports.PageNarrativeStatuses.LEGENDARY:
            return 'Legendary';
        case exports.PageNarrativeStatuses.SECRET:
            return 'Secret';
        default:
            return status;
    }
}
function pageNarrativeStatusTone(status) {
    switch (status) {
        case exports.PageNarrativeStatuses.DEAD:
        case exports.PageNarrativeStatuses.MISSING:
        case exports.PageNarrativeStatuses.ARCHIVED:
        case exports.PageNarrativeStatuses.RETIRED:
            return 'muted';
        case exports.PageNarrativeStatuses.RUMORED:
        case exports.PageNarrativeStatuses.LEGENDARY:
        case exports.PageNarrativeStatuses.HISTORICAL:
            return 'legend';
        case exports.PageNarrativeStatuses.SECRET:
            return 'secret';
        default:
            return 'neutral';
    }
}
function pageNarrativeStatusCssModifier(status) {
    switch (status) {
        case exports.PageNarrativeStatuses.DEAD:
        case exports.PageNarrativeStatuses.MISSING:
        case exports.PageNarrativeStatuses.ARCHIVED:
            return 'strikethrough';
        case exports.PageNarrativeStatuses.RETIRED:
            return 'muted';
        case exports.PageNarrativeStatuses.RUMORED:
        case exports.PageNarrativeStatuses.LEGENDARY:
        case exports.PageNarrativeStatuses.HISTORICAL:
            return 'legend';
        default:
            return 'none';
    }
}
function shouldShowPageNarrativeStatusBadge(status) {
    return status !== exports.PageNarrativeStatuses.ACTIVE;
}
function isPageNarrativeStatusVisibleToParty(status, ctx) {
    if (status !== exports.PageNarrativeStatuses.SECRET)
        return true;
    return ctx.perspective === 'elevated';
}
function projectPageNarrativeStatus(status, ctx, reason) {
    const visibleToParty = isPageNarrativeStatusVisibleToParty(status, ctx);
    return {
        status,
        label: formatPageNarrativeStatusLabel(status),
        tone: pageNarrativeStatusTone(status),
        cssModifier: pageNarrativeStatusCssModifier(status),
        visibleToParty,
        ...(reason ? { reason } : {}),
    };
}
function parseStatusSearchToken(query) {
    const match = /\bstatus:(\S+)/i.exec(query);
    if (!match?.[1])
        return null;
    return normalizePageNarrativeStatus(match[1]);
}
function stripStatusSearchToken(query) {
    return query.replace(/\bstatus:\S+\b/gi, '').trim();
}
//# sourceMappingURL=pageNarrativeStatus.js.map