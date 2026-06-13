"use strict";
/**
 * Codex continuity issue contracts (Layer 4 diagnostics — Phase 1).
 * Single shape for controllers, hooks, panels, and future projections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyContinuityIssueCounts = emptyContinuityIssueCounts;
exports.countContinuityIssues = countContinuityIssues;
exports.continuityFingerprint = continuityFingerprint;
exports.continuityIssueId = continuityIssueId;
function emptyContinuityIssueCounts() {
    return { critical: 0, warning: 0, info: 0 };
}
function countContinuityIssues(issues) {
    const counts = emptyContinuityIssueCounts();
    for (const issue of issues) {
        counts[issue.severity] += 1;
    }
    return counts;
}
const FINGERPRINT_PART_ORDER = {
    broken_link: ['pageId', 'targetPageId', 'slug'],
    unresolved_wikilink: ['sourcePageId', 'normalizedText'],
    unlinked_entity: ['pageId'],
    alias_collision: ['normalizedAlias'],
    temporal_posthumous_reference: [
        'sourcePageId',
        'targetPageId',
        'contentDateKey',
        'boundaryDateKey',
    ],
    temporal_dissolved_org_reference: [
        'sourcePageId',
        'targetPageId',
        'contentDateKey',
        'boundaryDateKey',
    ],
    narrative_dead_end: ['subjectPageId', 'ruleId', 'branchNodeId'],
    narrative_unreachable_conclusion: ['subjectPageId', 'ruleId', 'branchNodeId'],
    narrative_broken_chain: [
        'subjectPageId',
        'ruleId',
        'consequenceRuleId',
        'targetPageId',
        'branchNodeId',
    ],
    narrative_unresolved_thread: ['subjectPageId', 'ruleId'],
    narrative_incomplete_arc: ['subjectPageId', 'ruleId'],
    narrative_unreachable_hidden: ['subjectPageId', 'ruleId', 'branchNodeId'],
    narrative_branch_cycle: ['subjectPageId', 'ruleId', 'canonicalCycleKey'],
    narrative_unlock_cycle: ['ruleId', 'canonicalCycleKey'],
    calendar_prerequisite_cycle: ['ruleId', 'canonicalCycleKey'],
    narrative_orphan_entity: ['pageId', 'ruleId'],
    narrative_orphan_npc: ['pageId', 'ruleId'],
    narrative_orphan_faction: ['pageId', 'ruleId'],
    narrative_orphan_thread: ['pageId', 'ruleId'],
    narrative_orphan_quest: ['pageId', 'ruleId'],
    narrative_clue_single_point_of_failure: ['subjectPageId', 'ruleId', 'targetPageId'],
    narrative_progression_bottleneck: ['subjectPageId', 'ruleId', 'branchNodeId'],
    narrative_foreshadowing_no_reminder: ['subjectPageId', 'ruleId'],
    narrative_foreshadowing_stale: ['subjectPageId', 'ruleId'],
    narrative_foreshadowing_no_payoff: ['subjectPageId', 'ruleId'],
    narrative_density_high_branching: ['subjectPageId', 'ruleId'],
    narrative_density_clue_overload: ['ruleId'],
    narrative_density_clue_spof: ['subjectPageId', 'ruleId'],
    narrative_density_cluster_complexity: ['ruleId', 'clusterId'],
    narrative_density_thread_overload: ['ruleId'],
    narrative_dramatic_topology: ['pageId', 'kind', 'sceneIds'],
};
/** Stable keys for dismissals, dedup, caching, and future event sourcing. */
function continuityFingerprint(type, parts) {
    const keys = FINGERPRINT_PART_ORDER[type];
    const segments = keys.map((key) => {
        const value = parts[key]?.trim();
        return value ? value : '';
    });
    return `${type}:${segments.join(':')}`;
}
function continuityIssueId(fingerprint) {
    return fingerprint;
}
//# sourceMappingURL=continuityIssue.js.map