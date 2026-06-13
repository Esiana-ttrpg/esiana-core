"use strict";
/**
 * Layer 1 — downtime project simulation contracts (wiki-linked).
 * WikiPage = narrative surface; DowntimeProject row = simulation state.
 * @see docs/platform/downtime-projects.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_RISK_SEVERITIES = exports.PROJECT_OUTCOME_APPLICATION_SOURCES = exports.PROJECT_OUTCOME_STATUSES = exports.PROJECT_OUTCOME_KINDS = exports.DEFAULT_PROJECT_RESOURCE_SOURCE_KIND = exports.PROJECT_RESOURCE_SOURCE_KINDS = exports.OPERATION_POSTURES = exports.DOWNTIME_OPERATION_POSTURE_METADATA_KEY = exports.DEFAULT_PROJECT_PRIORITY = exports.PROJECT_PRIORITIES = exports.SIMULATION_PROJECT_STATUSES = exports.TERMINAL_PROJECT_STATUSES = exports.DEFAULT_PROJECT_STATUS = exports.PROJECT_STATUSES = exports.DEFAULT_PROJECT_TYPE = exports.PROJECT_TYPES = exports.DOWNTIME_PROJECT_TEMPLATE_TYPE = exports.DOWNTIME_PROJECT_SEMANTICS_VERSION = void 0;
exports.normalizeOperationPosture = normalizeOperationPosture;
exports.formatOperationPostureLabel = formatOperationPostureLabel;
exports.parseOperationPostureFromWikiMetadata = parseOperationPostureFromWikiMetadata;
exports.projectPrioritySortKey = projectPrioritySortKey;
exports.compareProjectSummariesByPriority = compareProjectSummariesByPriority;
exports.isTerminalProjectStatus = isTerminalProjectStatus;
exports.isSimulationProjectStatus = isSimulationProjectStatus;
exports.isValidProjectStatusTransition = isValidProjectStatusTransition;
exports.normalizeProjectType = normalizeProjectType;
exports.normalizeProjectStatus = normalizeProjectStatus;
exports.normalizeProjectPriority = normalizeProjectPriority;
exports.normalizeNullableString = normalizeNullableString;
exports.normalizeStringArray = normalizeStringArray;
exports.normalizeProjectResourceSourceKind = normalizeProjectResourceSourceKind;
exports.normalizeProjectResourceEntry = normalizeProjectResourceEntry;
exports.normalizeProjectBlockerEntry = normalizeProjectBlockerEntry;
exports.normalizeProjectOutcomeKind = normalizeProjectOutcomeKind;
exports.normalizeProjectOutcomeStatus = normalizeProjectOutcomeStatus;
exports.normalizeProjectOutcomeApplicationSource = normalizeProjectOutcomeApplicationSource;
exports.parseProjectTreasuryEffectPayload = parseProjectTreasuryEffectPayload;
exports.normalizeProjectOutcomeEntry = normalizeProjectOutcomeEntry;
exports.normalizeProjectRiskSeverity = normalizeProjectRiskSeverity;
exports.normalizeProjectRiskEntry = normalizeProjectRiskEntry;
exports.normalizeBigIntField = normalizeBigIntField;
exports.normalizeNullableBigInt = normalizeNullableBigInt;
exports.normalizeProgressPercent = normalizeProgressPercent;
exports.computeProgressPercent = computeProgressPercent;
exports.canProjectProgress = canProjectProgress;
exports.shouldAccumulateStall = shouldAccumulateStall;
exports.accumulateProjectStall = accumulateProjectStall;
exports.advanceProjectElapsed = advanceProjectElapsed;
exports.formatProjectRemainingLabel = formatProjectRemainingLabel;
exports.formatProjectStalledLabel = formatProjectStalledLabel;
exports.buildProjectRequiresSummary = buildProjectRequiresSummary;
exports.buildProjectBlockersSummary = buildProjectBlockersSummary;
exports.resolveProjectClockState = resolveProjectClockState;
exports.emptyDowntimeProjectFields = emptyDowntimeProjectFields;
exports.parseDowntimeProjectFields = parseDowntimeProjectFields;
exports.bigintToDto = bigintToDto;
const havenMetadata_js_1 = require("./havenMetadata.js");
exports.DOWNTIME_PROJECT_SEMANTICS_VERSION = 'downtime-project-v1';
exports.DOWNTIME_PROJECT_TEMPLATE_TYPE = 'DOWNTIME_PROJECT';
exports.PROJECT_TYPES = [
    'construction',
    'research',
    'training',
    'operations',
    'recovery',
];
exports.DEFAULT_PROJECT_TYPE = 'operations';
exports.PROJECT_STATUSES = [
    'PLANNED',
    'ACTIVE',
    'PAUSED',
    'SUSPENDED',
    'COMPLETED',
    'FAILED',
    'ABANDONED',
];
exports.DEFAULT_PROJECT_STATUS = 'PLANNED';
exports.TERMINAL_PROJECT_STATUSES = [
    'COMPLETED',
    'FAILED',
    'ABANDONED',
];
exports.SIMULATION_PROJECT_STATUSES = [
    'PLANNED',
    'ACTIVE',
    'PAUSED',
    'SUSPENDED',
];
exports.PROJECT_PRIORITIES = ['low', 'normal', 'high', 'critical'];
exports.DEFAULT_PROJECT_PRIORITY = 'normal';
/** Narrative posture on wiki metadata — not simulation status. */
exports.DOWNTIME_OPERATION_POSTURE_METADATA_KEY = 'downtimeOperationPosture';
exports.OPERATION_POSTURES = [
    'quiet_effort',
    'public_campaign',
    'urgent_response',
    'secret_operation',
    'long_term_undertaking',
];
const OPERATION_POSTURE_LABELS = {
    quiet_effort: 'Quiet effort',
    public_campaign: 'Public campaign',
    urgent_response: 'Urgent response',
    secret_operation: 'Secret operation',
    long_term_undertaking: 'Long-term undertaking',
};
function normalizeOperationPosture(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.OPERATION_POSTURES.includes(lower)) {
        return lower;
    }
    return null;
}
function formatOperationPostureLabel(posture) {
    if (!posture)
        return null;
    return OPERATION_POSTURE_LABELS[posture] ?? null;
}
function parseOperationPostureFromWikiMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return null;
    const record = metadata;
    return normalizeOperationPosture(record[exports.DOWNTIME_OPERATION_POSTURE_METADATA_KEY]);
}
exports.PROJECT_RESOURCE_SOURCE_KINDS = [
    'manual',
    'linked_page',
    'ledger',
    'future_hook',
];
exports.DEFAULT_PROJECT_RESOURCE_SOURCE_KIND = 'manual';
exports.PROJECT_OUTCOME_KINDS = [
    'unlock_entity',
    'alter_location',
    'generate_event',
    'haven_effect',
    'reputation_effect',
    'future_hook',
    'treasury_effect',
];
exports.PROJECT_OUTCOME_STATUSES = ['pending', 'applied'];
exports.PROJECT_OUTCOME_APPLICATION_SOURCES = [
    'project_progression',
    'manual_patch',
    'replay',
];
exports.PROJECT_RISK_SEVERITIES = ['low', 'medium', 'high'];
const PRIORITY_SORT_ORDER = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
};
function projectPrioritySortKey(priority) {
    if (!priority)
        return PRIORITY_SORT_ORDER.normal;
    return PRIORITY_SORT_ORDER[priority] ?? PRIORITY_SORT_ORDER.normal;
}
function compareProjectSummariesByPriority(a, b) {
    const priorityDiff = projectPrioritySortKey(a.priority) - projectPrioritySortKey(b.priority);
    if (priorityDiff !== 0)
        return priorityDiff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}
function isTerminalProjectStatus(status) {
    return exports.TERMINAL_PROJECT_STATUSES.includes(status);
}
function isSimulationProjectStatus(status) {
    return exports.SIMULATION_PROJECT_STATUSES.includes(status);
}
const ALLOWED_STATUS_TRANSITIONS = {
    PLANNED: ['ACTIVE', 'ABANDONED'],
    ACTIVE: ['PAUSED', 'SUSPENDED', 'COMPLETED', 'FAILED', 'ABANDONED'],
    PAUSED: ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'FAILED', 'ABANDONED'],
    SUSPENDED: ['ACTIVE', 'PAUSED', 'FAILED', 'ABANDONED'],
    COMPLETED: [],
    FAILED: [],
    ABANDONED: [],
};
function isValidProjectStatusTransition(from, to) {
    if (from === to)
        return true;
    return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
function normalizeProjectType(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.PROJECT_TYPES.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_PROJECT_TYPE;
}
function normalizeProjectStatus(raw) {
    if (typeof raw === 'string') {
        const upper = raw.trim().toUpperCase();
        if (exports.PROJECT_STATUSES.includes(upper)) {
            return upper;
        }
    }
    return exports.DEFAULT_PROJECT_STATUS;
}
function normalizeProjectPriority(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.PROJECT_PRIORITIES.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_PROJECT_PRIORITY;
}
function normalizeNullableString(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeStringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    const seen = new Set();
    const result = [];
    for (const item of raw) {
        if (typeof item !== 'string')
            continue;
        const trimmed = item.trim();
        if (!trimmed || seen.has(trimmed))
            continue;
        seen.add(trimmed);
        result.push(trimmed);
    }
    return result;
}
function normalizeEntryId(raw, fallbackLabel) {
    if (typeof raw === 'string' && raw.trim())
        return raw.trim();
    return `entry-${fallbackLabel.toLowerCase().replace(/\s+/g, '-').slice(0, 48)}`;
}
function normalizeProjectResourceSourceKind(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.PROJECT_RESOURCE_SOURCE_KINDS.includes(lower)) {
            return lower;
        }
    }
    return exports.DEFAULT_PROJECT_RESOURCE_SOURCE_KIND;
}
function normalizeProjectResourceEntry(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    const quantity = typeof record.quantity === 'number' && Number.isFinite(record.quantity)
        ? record.quantity
        : null;
    return {
        id: normalizeEntryId(record.id, label),
        label,
        quantity,
        unit: normalizeNullableString(record.unit),
        satisfied: record.satisfied === true,
        linkedPageId: normalizeNullableString(record.linkedPageId),
        sourceKind: normalizeProjectResourceSourceKind(record.sourceKind),
        ledgerAmount: typeof record.ledgerAmount === 'number' && Number.isFinite(record.ledgerAmount)
            ? Math.floor(record.ledgerAmount)
            : null,
        ledgerImpactKind: record.ledgerImpactKind === 'credit' || record.ledgerImpactKind === 'debit'
            ? record.ledgerImpactKind
            : null,
    };
}
function normalizeProjectBlockerEntry(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeEntryId(record.id, label),
        label,
        description: normalizeNullableString(record.description),
        resolved: record.resolved === true,
        linkedPageId: normalizeNullableString(record.linkedPageId),
    };
}
function normalizeProjectOutcomeKind(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.PROJECT_OUTCOME_KINDS.includes(lower)) {
            return lower;
        }
    }
    return 'future_hook';
}
function normalizeProjectOutcomeStatus(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.PROJECT_OUTCOME_STATUSES.includes(lower)) {
            return lower;
        }
    }
    return 'pending';
}
function normalizeProjectOutcomeApplicationSource(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    if (exports.PROJECT_OUTCOME_APPLICATION_SOURCES.includes(lower)) {
        return lower;
    }
    return null;
}
function parseProjectTreasuryEffectPayload(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const amount = typeof record.amount === 'number' && Number.isFinite(record.amount)
        ? Math.floor(record.amount)
        : null;
    if (amount == null || amount <= 0)
        return null;
    const kind = record.kind === 'credit' || record.kind === 'debit' ? record.kind : null;
    if (!kind)
        return null;
    const categoryRaw = record.category;
    const category = typeof categoryRaw === 'string' &&
        [
            'upkeep',
            'project',
            'income',
            'reward',
            'trade',
            'donation',
            'debt',
            'other',
        ].includes(categoryRaw)
        ? categoryRaw
        : null;
    const title = typeof record.title === 'string' && record.title.trim() ? record.title.trim() : null;
    return { amount, kind, category, title };
}
function normalizeProjectOutcomeEntry(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const description = normalizeNullableString(record.description);
    const kind = normalizeProjectOutcomeKind(record.outcomeKind);
    const id = normalizeEntryId(record.id, description ?? kind);
    return {
        id,
        outcomeKind: kind,
        description,
        linkedPageIds: normalizeStringArray(record.linkedPageIds),
        status: normalizeProjectOutcomeStatus(record.status),
        appliedAtEpochMinute: record.appliedAtEpochMinute !== undefined
            ? (() => {
                const parsed = normalizeNullableBigInt(record.appliedAtEpochMinute);
                return parsed != null ? parsed.toString() : null;
            })()
            : undefined,
        applicationSource: normalizeProjectOutcomeApplicationSource(record.applicationSource),
        applicationRunId: normalizeNullableString(record.applicationRunId),
        havenEffect: record.havenEffect !== undefined
            ? (0, havenMetadata_js_1.parseProjectHavenEffectPayload)(record.havenEffect)
            : undefined,
        treasuryEffect: record.treasuryEffect !== undefined
            ? parseProjectTreasuryEffectPayload(record.treasuryEffect)
            : undefined,
    };
}
function normalizeProjectRiskSeverity(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (exports.PROJECT_RISK_SEVERITIES.includes(lower)) {
            return lower;
        }
    }
    return null;
}
function normalizeProjectRiskEntry(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const label = normalizeNullableString(record.label);
    if (!label)
        return null;
    return {
        id: normalizeEntryId(record.id, label),
        label,
        severity: normalizeProjectRiskSeverity(record.severity),
        description: normalizeNullableString(record.description),
        linkedPageId: normalizeNullableString(record.linkedPageId),
    };
}
function normalizeEntryArray(raw, normalizer) {
    if (!Array.isArray(raw))
        return [];
    const result = [];
    for (const item of raw) {
        const parsed = normalizer(item);
        if (parsed)
            result.push(parsed);
    }
    return result;
}
function normalizeBigIntField(raw, fallback = 0n) {
    if (typeof raw === 'bigint')
        return raw >= 0n ? raw : fallback;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
        return BigInt(Math.trunc(raw));
    }
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = BigInt(raw.trim());
            return parsed >= 0n ? parsed : fallback;
        }
        catch {
            return fallback;
        }
    }
    return fallback;
}
function normalizeNullableBigInt(raw) {
    if (raw === null || raw === undefined)
        return null;
    const parsed = normalizeBigIntField(raw, -1n);
    return parsed >= 0n ? parsed : null;
}
function normalizeProgressPercent(raw) {
    if (typeof raw !== 'number' || !Number.isFinite(raw))
        return 0;
    return Math.min(100, Math.max(0, Math.round(raw)));
}
/**
 * Presentation-oriented progress derived from elapsed/total minutes.
 * Canonical simulation truth remains duration fields + status.
 */
function computeProgressPercent(elapsedMinutes, totalMinutes) {
    if (totalMinutes <= 0n)
        return 0;
    if (elapsedMinutes <= 0n)
        return 0;
    if (elapsedMinutes >= totalMinutes)
        return 100;
    const percent = Number((elapsedMinutes * 100n) / totalMinutes);
    return normalizeProgressPercent(percent);
}
const MINUTES_PER_DAY = 1440n;
/** Gate: all blockers resolved and all resources satisfied. */
function canProjectProgress(fields) {
    if (fields.status !== 'ACTIVE')
        return false;
    if (fields.blockers.some((entry) => !entry.resolved))
        return false;
    if (fields.resources.some((entry) => !entry.satisfied))
        return false;
    return true;
}
function shouldAccumulateStall(status, canProgress) {
    if (status === 'PAUSED' || status === 'SUSPENDED')
        return true;
    if (status === 'ACTIVE' && !canProgress)
        return true;
    return false;
}
function accumulateProjectStall(fields, deltaMinutes) {
    if (deltaMinutes <= 0n)
        return fields;
    return {
        ...fields,
        stalledDurationMinutes: fields.stalledDurationMinutes + deltaMinutes,
    };
}
function completeProjectFields(fields, nextEpochMinute) {
    const total = fields.durationTotalMinutes;
    const elapsed = total > 0n && fields.durationElapsedMinutes < total
        ? total
        : fields.durationElapsedMinutes;
    return {
        ...fields,
        status: 'COMPLETED',
        durationElapsedMinutes: elapsed,
        progressPercent: computeProgressPercent(elapsed, total),
        completedAtEpochMinute: fields.completedAtEpochMinute ?? nextEpochMinute,
    };
}
/**
 * Apply one time-advance tick to simulation fields (pure).
 * Caller persists when result indicates change.
 */
function advanceProjectElapsed(fields, deltaMinutes, nextEpochMinute) {
    if (deltaMinutes <= 0n || isTerminalProjectStatus(fields.status)) {
        return { fields, completed: false, stalled: false, progressed: false };
    }
    const progressAllowed = canProjectProgress(fields);
    if (shouldAccumulateStall(fields.status, progressAllowed)) {
        const stalledFields = accumulateProjectStall(fields, deltaMinutes);
        return {
            fields: stalledFields,
            completed: false,
            stalled: true,
            progressed: false,
        };
    }
    if (fields.status !== 'ACTIVE' || !progressAllowed) {
        return { fields, completed: false, stalled: false, progressed: false };
    }
    if (fields.durationTotalMinutes <= 0n) {
        const completed = completeProjectFields(fields, nextEpochMinute);
        return { fields: completed, completed: true, stalled: false, progressed: true };
    }
    const nextElapsed = fields.durationElapsedMinutes + deltaMinutes;
    const cappedElapsed = nextElapsed >= fields.durationTotalMinutes
        ? fields.durationTotalMinutes
        : nextElapsed;
    let nextFields = {
        ...fields,
        durationElapsedMinutes: cappedElapsed,
        progressPercent: computeProgressPercent(cappedElapsed, fields.durationTotalMinutes),
    };
    if (cappedElapsed >= fields.durationTotalMinutes) {
        nextFields = completeProjectFields(nextFields, nextEpochMinute);
        return {
            fields: nextFields,
            completed: true,
            stalled: false,
            progressed: true,
        };
    }
    return {
        fields: nextFields,
        completed: false,
        stalled: false,
        progressed: true,
    };
}
function formatProjectRemainingLabel(elapsedMinutes, totalMinutes) {
    if (totalMinutes <= 0n)
        return null;
    if (elapsedMinutes >= totalMinutes)
        return null;
    const remaining = totalMinutes - elapsedMinutes;
    if (remaining < MINUTES_PER_DAY)
        return 'Less than a day remaining';
    const days = remaining / MINUTES_PER_DAY;
    if (days === 1n)
        return '1 day remaining';
    if (days < 7n)
        return `${days.toString()} days remaining`;
    const weeks = days / 7n;
    if (weeks === 1n)
        return 'About 1 week remaining';
    if (weeks < 5n)
        return `About ${weeks.toString()} weeks remaining`;
    const months = days / 30n;
    if (months === 1n)
        return 'About 1 month remaining';
    return `About ${months.toString()} months remaining`;
}
function formatProjectStalledLabel(stalledMinutes) {
    if (stalledMinutes < MINUTES_PER_DAY)
        return null;
    const days = stalledMinutes / MINUTES_PER_DAY;
    if (days === 1n)
        return 'Stalled for 1 day';
    if (days < 7n)
        return `Stalled for ${days.toString()} days`;
    const weeks = days / 7n;
    if (weeks === 1n)
        return 'Stalled for 1 week';
    if (weeks < 5n)
        return `Stalled for ${weeks.toString()} weeks`;
    const months = days / 30n;
    if (months === 1n)
        return 'Stalled for 1 month';
    return `Stalled for ${months.toString()} months`;
}
function buildProjectRequiresSummary(resources) {
    const unsatisfied = resources.filter((entry) => !entry.satisfied);
    if (unsatisfied.length === 0)
        return null;
    const labels = unsatisfied.map((entry) => entry.label);
    return `Requires: ${labels.join(', ')}`;
}
function buildProjectBlockersSummary(blockers) {
    const unresolved = blockers.filter((entry) => !entry.resolved);
    if (unresolved.length === 0)
        return null;
    const labels = unresolved.map((entry) => entry.label);
    return `Blocked by: ${labels.join(', ')}`;
}
function resolveProjectClockState(status, canProgress) {
    if (status === 'COMPLETED')
        return 'complete';
    if (status === 'FAILED' || status === 'ABANDONED')
        return 'failed';
    if (status === 'PAUSED' || status === 'SUSPENDED')
        return 'paused';
    if (status === 'ACTIVE' && !canProgress)
        return 'waiting';
    if (status === 'ACTIVE')
        return 'running';
    return 'paused';
}
function emptyDowntimeProjectFields() {
    return {
        semanticsVersion: exports.DOWNTIME_PROJECT_SEMANTICS_VERSION,
        projectType: exports.DEFAULT_PROJECT_TYPE,
        status: exports.DEFAULT_PROJECT_STATUS,
        priority: exports.DEFAULT_PROJECT_PRIORITY,
        progressPercent: 0,
        durationTotalMinutes: 0n,
        durationElapsedMinutes: 0n,
        stalledDurationMinutes: 0n,
        startedAtEpochMinute: null,
        completedAtEpochMinute: null,
        targetCompletionEpochMinute: null,
        ownerPageId: null,
        havenPageId: null,
        relatedPageIds: [],
        resources: [],
        blockers: [],
        outcomes: [],
        risks: [],
    };
}
function parseDowntimeProjectFields(raw) {
    if (!raw || typeof raw !== 'object') {
        return emptyDowntimeProjectFields();
    }
    const record = raw;
    const durationTotalMinutes = normalizeBigIntField(record.durationTotalMinutes);
    const durationElapsedMinutes = normalizeBigIntField(record.durationElapsedMinutes);
    const stalledDurationMinutes = normalizeBigIntField(record.stalledDurationMinutes);
    const derivedProgress = computeProgressPercent(durationElapsedMinutes, durationTotalMinutes);
    const explicitProgress = record.progressPercent !== undefined
        ? normalizeProgressPercent(record.progressPercent)
        : derivedProgress;
    return {
        semanticsVersion: typeof record.semanticsVersion === 'string' && record.semanticsVersion.trim()
            ? record.semanticsVersion.trim()
            : exports.DOWNTIME_PROJECT_SEMANTICS_VERSION,
        projectType: normalizeProjectType(record.projectType),
        status: normalizeProjectStatus(record.status),
        priority: normalizeProjectPriority(record.priority),
        progressPercent: explicitProgress,
        durationTotalMinutes,
        durationElapsedMinutes,
        stalledDurationMinutes,
        startedAtEpochMinute: normalizeNullableBigInt(record.startedAtEpochMinute),
        completedAtEpochMinute: normalizeNullableBigInt(record.completedAtEpochMinute),
        targetCompletionEpochMinute: normalizeNullableBigInt(record.targetCompletionEpochMinute),
        ownerPageId: normalizeNullableString(record.ownerPageId),
        havenPageId: normalizeNullableString(record.havenPageId),
        relatedPageIds: normalizeStringArray(record.relatedPageIds),
        resources: normalizeEntryArray(record.resources, normalizeProjectResourceEntry),
        blockers: normalizeEntryArray(record.blockers, normalizeProjectBlockerEntry),
        outcomes: normalizeEntryArray(record.outcomes, normalizeProjectOutcomeEntry),
        risks: normalizeEntryArray(record.risks, normalizeProjectRiskEntry),
    };
}
function bigintToDto(value) {
    if (value == null)
        return null;
    return value.toString();
}
//# sourceMappingURL=projectMetadata.js.map