"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapContinuityIssueToPressure = mapContinuityIssueToPressure;
exports.buildNarrativePressureFeed = buildNarrativePressureFeed;
exports.narrativeWeightToScore = narrativeWeightToScore;
const PRODUCER_CATEGORY = {
    narrative_clue_redundancy_analyzer: 'investigative',
    narrative_hidden_reachability_analyzer: 'investigative',
    narrative_orphan_analyzer: 'structural',
    narrative_dead_end_analyzer: 'structural',
    narrative_circular_dependency_analyzer: 'structural',
    narrative_foreshadowing_analyzer: 'emotional',
    narrative_density_analyzer: 'structural',
    dramatic_topology_analyzer: 'emotional',
    chronology_analyzer: 'temporal',
};
const SEVERITY_RANK = {
    critical: 3,
    warning: 2,
    info: 1,
};
function mapContinuityIssueToPressure(issue, weightByEntityId) {
    const linkedEntityIds = [
        ...(issue.pageId ? [issue.pageId] : []),
        ...(issue.relatedPageId ? [issue.relatedPageId] : []),
        ...(issue.relatedPageIds ?? []),
    ].filter((id, index, arr) => arr.indexOf(id) === index);
    let weightMultiplier = 1;
    if (weightByEntityId && linkedEntityIds.length > 0) {
        const maxWeight = Math.max(...linkedEntityIds.map((id) => weightByEntityId.get(id) ?? 1));
        weightMultiplier = maxWeight;
    }
    const category = PRODUCER_CATEGORY[issue.producer] ??
        (issue.issueCategory === 'narrative_intent' ? 'emotional' : 'structural');
    return {
        id: issue.fingerprint,
        severity: issue.severity,
        category,
        message: issue.message,
        linkedEntityIds,
        weightMultiplier,
        sourceProducer: issue.producer,
        sourceIssueType: issue.type,
    };
}
function buildNarrativePressureFeed(issues, weightByEntityId) {
    return issues
        .map((issue) => mapContinuityIssueToPressure(issue, weightByEntityId))
        .sort((a, b) => {
        const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (severityDiff !== 0)
            return severityDiff;
        return b.weightMultiplier - a.weightMultiplier;
    });
}
function narrativeWeightToScore(weight) {
    switch (weight) {
        case 'critical':
            return 3;
        case 'major':
            return 2;
        case 'minor':
            return 1;
        default:
            return 2;
    }
}
//# sourceMappingURL=narrativePressureFeed.js.map