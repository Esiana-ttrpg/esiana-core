"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_NARRATIVE_CONTINUITY_CAP = void 0;
exports.rankContinuityIssue = rankContinuityIssue;
exports.truncateContinuityIssues = truncateContinuityIssues;
exports.truncateNarrativeContinuityIssues = truncateNarrativeContinuityIssues;
const SEVERITY_RANK = {
    critical: 3,
    warning: 2,
    info: 1,
};
const NARRATIVE_ANALYZER_PRODUCERS = new Set([
    'narrative_dead_end_analyzer',
    'narrative_hidden_reachability_analyzer',
    'narrative_circular_dependency_analyzer',
    'narrative_orphan_analyzer',
    'narrative_clue_redundancy_analyzer',
    'narrative_foreshadowing_analyzer',
    'narrative_density_analyzer',
]);
function rankContinuityIssue(issue, context = {}) {
    const severity = SEVERITY_RANK[issue.severity] * 1_000_000;
    const narrativeEntity = issue.pageId && issue.producer !== 'link_integrity' ? 100_000 : 0;
    const activeParticipation = issue.pageId && context.activeNarrativePageIds?.has(issue.pageId) ? 50_000 : 0;
    const recency = issue.pageId
        ? (context.recencyByPageId?.get(issue.pageId) ?? 0)
        : 0;
    return severity + narrativeEntity + activeParticipation + recency / 1_000_000;
}
function truncateContinuityIssues(issues, cap, context = {}) {
    if (issues.length <= cap)
        return issues;
    return [...issues]
        .sort((a, b) => rankContinuityIssue(b, context) - rankContinuityIssue(a, context))
        .slice(0, cap);
}
function truncateNarrativeContinuityIssues(issues, cap, context = {}) {
    const narrative = issues.filter((i) => NARRATIVE_ANALYZER_PRODUCERS.has(i.producer));
    const other = issues.filter((i) => !NARRATIVE_ANALYZER_PRODUCERS.has(i.producer));
    const truncatedNarrative = truncateContinuityIssues(narrative, cap, context);
    return [...other, ...truncatedNarrative];
}
exports.GLOBAL_NARRATIVE_CONTINUITY_CAP = 50;
//# sourceMappingURL=continuityIssuePriority.js.map