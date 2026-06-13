"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORESHADOWING_STALE_MS = void 0;
exports.deriveForeshadowingStage = deriveForeshadowingStage;
exports.buildForeshadowingChainEntry = buildForeshadowingChainEntry;
exports.detectForeshadowingIssues = detectForeshadowingIssues;
exports.FORESHADOWING_STALE_MS = 60 * 24 * 60 * 60 * 1000;
const TRACKED_KINDS = new Set(['foreshadowing', 'promise', 'mystery']);
function deriveForeshadowingStage(thread) {
    if (thread.threadStatus === 'ABANDONED')
        return 'abandoned';
    if (thread.threadStatus === 'RESOLVED' || thread.resolvedSessionId) {
        return 'resolved';
    }
    if (thread.payoffPageId && thread.threadStatus === 'OPEN') {
        return 'payoff_pending';
    }
    const reinforced = thread.lastAdvancedSessionId &&
        thread.introducedSessionId &&
        thread.lastAdvancedSessionId !== thread.introducedSessionId;
    if (reinforced)
        return 'reinforced';
    if (thread.introducedSessionId)
        return 'introduced';
    return 'introduced';
}
function buildForeshadowingChainEntry(row) {
    return {
        threadPageId: row.threadPageId,
        threadKind: row.thread.threadKind,
        stage: deriveForeshadowingStage(row.thread),
        introducedSessionId: row.thread.introducedSessionId,
        lastAdvancedSessionId: row.thread.lastAdvancedSessionId,
        payoffPageId: row.thread.payoffPageId,
        resolvedSessionId: row.thread.resolvedSessionId,
    };
}
function detectForeshadowingIssues(input) {
    const now = input.now ?? new Date();
    const staleMs = input.staleMs ?? exports.FORESHADOWING_STALE_MS;
    const findings = [];
    for (const row of input.threads) {
        const { thread } = row;
        if (thread.playerSubmitted || thread.threadKind === 'theory')
            continue;
        if (!TRACKED_KINDS.has(thread.threadKind))
            continue;
        if (thread.threadStatus !== 'OPEN' && thread.threadStatus !== 'DORMANT')
            continue;
        const stage = deriveForeshadowingStage(thread);
        if (stage === 'introduced') {
            findings.push({
                ruleId: 'foreshadowing_introduced_only',
                issueType: 'narrative_foreshadowing_no_reminder',
                severity: 'info',
                threadPageId: row.threadPageId,
                title: row.title,
                stage,
                threadKind: thread.threadKind,
            });
            continue;
        }
        if (stage === 'reinforced' && !thread.payoffPageId) {
            const stale = row.updatedAtMs !== undefined &&
                now.getTime() - row.updatedAtMs > staleMs;
            if (stale) {
                findings.push({
                    ruleId: 'foreshadowing_stale_reinforcement',
                    issueType: 'narrative_foreshadowing_stale',
                    severity: 'warning',
                    threadPageId: row.threadPageId,
                    title: row.title,
                    stage,
                    threadKind: thread.threadKind,
                });
            }
            else {
                findings.push({
                    ruleId: 'foreshadowing_payoff_pending',
                    issueType: 'narrative_foreshadowing_no_payoff',
                    severity: thread.narrativeWeight === 'critical' ? 'critical' : 'warning',
                    threadPageId: row.threadPageId,
                    title: row.title,
                    stage,
                    threadKind: thread.threadKind,
                });
            }
        }
    }
    return findings;
}
//# sourceMappingURL=narrativeForeshadowingTracker.js.map