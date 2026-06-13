"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORY_THREAD_MILESTONE_KINDS = void 0;
exports.resolveThreadHistoryAnchorSessionId = resolveThreadHistoryAnchorSessionId;
exports.buildStoryThreadMilestones = buildStoryThreadMilestones;
exports.deriveLastTouchFromMilestones = deriveLastTouchFromMilestones;
exports.deriveSessionsSinceLastTouch = deriveSessionsSinceLastTouch;
exports.deriveStoryThreadVisualEmphasis = deriveStoryThreadVisualEmphasis;
exports.compareStoryThreadHistoryEntries = compareStoryThreadHistoryEntries;
exports.buildStoryThreadHistoryEntry = buildStoryThreadHistoryEntry;
exports.buildStoryThreadHistoryProjection = buildStoryThreadHistoryProjection;
const narrativeForeshadowingTracker_js_1 = require("./narrativeForeshadowingTracker.js");
const threadDisplay_js_1 = require("./threadDisplay.js");
const TRACKED_KINDS = new Set(['foreshadowing', 'promise', 'mystery']);
const STALE_SESSION_GAP = 4;
const STAGE_SORT_ORDER = {
    introduced: 0,
    reinforced: 1,
    payoff_pending: 2,
    resolved: 3,
    abandoned: 4,
};
const EMPHASIS_SORT_ORDER = {
    dominant: 0,
    standard: 1,
    muted: 2,
};
const WEIGHT_SORT_ORDER = {
    critical: 0,
    major: 1,
    minor: 2,
};
const TERMINAL_STAGES = new Set(['resolved', 'abandoned']);
const MILESTONE_KINDS = [
    'introduced',
    'reinforced',
    'payoff',
    'resolved',
];
function compareTitles(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
function sessionMap(sessions) {
    return new Map(sessions.map((session) => [session.id, session]));
}
function resolveThreadHistoryAnchorSessionId(sessions, threadSessionIds) {
    if (sessions.length === 0)
        return null;
    const sorted = [...sessions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const sessionIndex = new Map(sorted.map((session, index) => [session.id, index]));
    let lastTouchedIndex = -1;
    for (const sessionId of threadSessionIds) {
        if (!sessionId)
            continue;
        const index = sessionIndex.get(sessionId);
        if (index != null) {
            lastTouchedIndex = Math.max(lastTouchedIndex, index);
        }
    }
    if (lastTouchedIndex >= 0 && lastTouchedIndex + 1 < sorted.length) {
        return sorted[lastTouchedIndex + 1].id;
    }
    return sorted[0].id;
}
function isTrackedThread(thread) {
    if (thread.playerSubmitted || thread.threadKind === 'theory')
        return false;
    return TRACKED_KINDS.has(thread.threadKind);
}
function sessionMilestone(kind, sessionId, sessions, reached) {
    const session = sessionId ? sessions.get(sessionId) : undefined;
    return {
        kind,
        sessionId,
        sessionTitle: session?.title ?? null,
        sessionSequenceOrder: session?.sequenceOrder ?? null,
        reached,
    };
}
function buildStoryThreadMilestones(input) {
    const { thread, stage, sessions, pageTitlesById } = input;
    const introducedReached = Boolean(thread.introducedSessionId);
    const reinforcedReached = Boolean(thread.lastAdvancedSessionId) &&
        thread.lastAdvancedSessionId !== thread.introducedSessionId;
    const payoffReached = Boolean(thread.payoffPageId);
    const resolvedReached = Boolean(thread.resolvedSessionId) || TERMINAL_STAGES.has(stage);
    return [
        sessionMilestone('introduced', thread.introducedSessionId, sessions, introducedReached),
        sessionMilestone('reinforced', thread.lastAdvancedSessionId, sessions, reinforcedReached),
        {
            kind: 'payoff',
            sessionId: null,
            sessionTitle: null,
            sessionSequenceOrder: null,
            pageId: thread.payoffPageId,
            pageTitle: thread.payoffPageId
                ? (pageTitlesById.get(thread.payoffPageId) ?? null)
                : null,
            reached: payoffReached,
        },
        sessionMilestone('resolved', thread.resolvedSessionId, sessions, resolvedReached),
    ];
}
function deriveLastTouchFromMilestones(milestones) {
    const priority = ['resolved', 'reinforced', 'introduced'];
    for (const kind of priority) {
        const milestone = milestones.find((entry) => entry.kind === kind && entry.reached);
        if (milestone?.sessionId) {
            return {
                lastTouchMilestoneKind: kind,
                lastTouchSessionId: milestone.sessionId,
                lastTouchSessionSequenceOrder: milestone.sessionSequenceOrder,
            };
        }
    }
    return {
        lastTouchMilestoneKind: null,
        lastTouchSessionId: null,
        lastTouchSessionSequenceOrder: null,
    };
}
function deriveSessionsSinceLastTouch(input) {
    const { anchorSessionId, sessions, lastTouchSessionSequenceOrder } = input;
    if (anchorSessionId == null || lastTouchSessionSequenceOrder == null)
        return null;
    const anchor = sessions.find((session) => session.id === anchorSessionId);
    if (!anchor)
        return null;
    return Math.max(0, anchor.sequenceOrder - lastTouchSessionSequenceOrder);
}
function deriveStoryThreadVisualEmphasis(input) {
    if (TERMINAL_STAGES.has(input.stage))
        return 'muted';
    if (input.narrativeWeight === 'critical')
        return 'dominant';
    if (input.narrativeWeight === 'major' &&
        input.sessionsSinceLastTouch != null &&
        input.sessionsSinceLastTouch >= STALE_SESSION_GAP) {
        return 'dominant';
    }
    return 'standard';
}
function emptyStageCounts() {
    return {
        introduced: 0,
        reinforced: 0,
        payoff_pending: 0,
        resolved: 0,
        abandoned: 0,
    };
}
function compareStoryThreadHistoryEntries(a, b) {
    const stageDiff = STAGE_SORT_ORDER[a.stage] - STAGE_SORT_ORDER[b.stage];
    if (stageDiff !== 0)
        return stageDiff;
    const emphasisDiff = EMPHASIS_SORT_ORDER[a.visualEmphasis] - EMPHASIS_SORT_ORDER[b.visualEmphasis];
    if (emphasisDiff !== 0)
        return emphasisDiff;
    const weightDiff = WEIGHT_SORT_ORDER[a.narrativeWeight] - WEIGHT_SORT_ORDER[b.narrativeWeight];
    if (weightDiff !== 0)
        return weightDiff;
    return compareTitles(a.title, b.title);
}
function buildStoryThreadHistoryEntry(input) {
    const sessionsById = sessionMap(input.sessions);
    const stage = input.chain.stage;
    const milestones = buildStoryThreadMilestones({
        thread: input.row.thread,
        stage,
        sessions: sessionsById,
        pageTitlesById: input.pageTitlesById,
    });
    const lastTouch = deriveLastTouchFromMilestones(milestones);
    const sessionsSinceLastTouch = deriveSessionsSinceLastTouch({
        anchorSessionId: input.anchorSessionId,
        sessions: input.sessions,
        lastTouchSessionSequenceOrder: lastTouch.lastTouchSessionSequenceOrder,
    });
    const visualEmphasis = deriveStoryThreadVisualEmphasis({
        stage,
        narrativeWeight: input.row.thread.narrativeWeight,
        sessionsSinceLastTouch,
    });
    return {
        threadPageId: input.row.threadPageId,
        title: input.row.title,
        threadKind: input.row.thread.threadKind,
        narrativeWeight: input.row.thread.narrativeWeight,
        stage,
        milestones,
        diagnosticRuleIds: input.findingsByThreadId.get(input.row.threadPageId) ?? [],
        lastTouchMilestoneKind: lastTouch.lastTouchMilestoneKind,
        lastTouchSessionId: lastTouch.lastTouchSessionId,
        lastTouchSessionSequenceOrder: lastTouch.lastTouchSessionSequenceOrder,
        sessionsSinceLastTouch,
        anchorSessionId: input.anchorSessionId,
        visualEmphasis,
    };
}
function buildStoryThreadHistoryProjection(input) {
    const pageTitlesById = input.pageTitlesById instanceof Map
        ? input.pageTitlesById
        : new Map(Object.entries(input.pageTitlesById ?? {}));
    const trackedRows = input.threads.filter((row) => isTrackedThread(row.thread));
    const chainByThreadId = new Map();
    if (input.chains) {
        for (const chain of input.chains) {
            chainByThreadId.set(chain.threadPageId, chain);
        }
    }
    const findingsByThreadId = new Map();
    for (const finding of input.findings ?? []) {
        const existing = findingsByThreadId.get(finding.threadPageId) ?? [];
        if (!existing.includes(finding.ruleId)) {
            existing.push(finding.ruleId);
        }
        findingsByThreadId.set(finding.threadPageId, existing);
    }
    const allSessionIds = [];
    for (const row of trackedRows) {
        const { thread } = row;
        if (thread.introducedSessionId)
            allSessionIds.push(thread.introducedSessionId);
        if (thread.lastAdvancedSessionId)
            allSessionIds.push(thread.lastAdvancedSessionId);
        if (thread.resolvedSessionId)
            allSessionIds.push(thread.resolvedSessionId);
    }
    const anchorSessionId = resolveThreadHistoryAnchorSessionId(input.sessions, allSessionIds);
    const stageCounts = emptyStageCounts();
    const entries = [];
    for (const row of trackedRows) {
        const chain = chainByThreadId.get(row.threadPageId) ??
            (0, narrativeForeshadowingTracker_js_1.buildForeshadowingChainEntry)({
                threadPageId: row.threadPageId,
                title: row.title,
                thread: row.thread,
            });
        const entry = buildStoryThreadHistoryEntry({
            row,
            chain,
            sessions: input.sessions,
            pageTitlesById,
            findingsByThreadId,
            anchorSessionId,
        });
        stageCounts[entry.stage] += 1;
        entries.push(entry);
    }
    entries.sort(compareStoryThreadHistoryEntries);
    const kindFilterOptions = ['foreshadowing', 'promise', 'mystery'].map((kind) => ({
        kind,
        label: threadDisplay_js_1.THREAD_KIND_GROUP_LABELS[kind],
    }));
    return {
        threads: entries,
        stageCounts,
        kindFilterOptions,
        anchorSessionId,
    };
}
exports.STORY_THREAD_MILESTONE_KINDS = MILESTONE_KINDS;
//# sourceMappingURL=storyThreadHistoryProjection.js.map