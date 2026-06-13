"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBranchConditionSatisfiable = isBranchConditionSatisfiable;
exports.detectHiddenReachabilityIssues = detectHiddenReachabilityIssues;
const contentPresence_js_1 = require("./contentPresence.js");
const narrativeBranch_js_1 = require("./narrativeBranch.js");
const narrativeBranchAnalysis_js_1 = require("./narrativeBranchAnalysis.js");
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const narrativeDeadEnd_js_1 = require("./narrativeDeadEnd.js");
function canReachLifecycleState(from, target) {
    if (from === target)
        return true;
    const visited = new Set([from]);
    const queue = [from];
    while (queue.length > 0) {
        const current = queue.shift();
        for (const next of (0, narrativeLifecycle_js_1.allowedLifecycleTransitions)(current)) {
            if (next === target)
                return true;
            if (visited.has(next))
                continue;
            visited.add(next);
            queue.push(next);
        }
    }
    return false;
}
function isBranchConditionSatisfiable(condition, index) {
    if (!condition)
        return true;
    switch (condition.type) {
        case 'manual_flag':
            return true;
        case 'lifecycle': {
            if (!index.existingPageIds.has(condition.subjectId))
                return false;
            const current = index.lifecycleBySubjectId.get(condition.subjectId);
            if (!current)
                return false;
            return canReachLifecycleState(current, condition.state);
        }
        case 'calendar_event':
            return index.calendarEventIds.has(condition.eventId);
        case 'graph_edge':
            return index.liveGraphEdges.has((0, narrativeBranchAnalysis_js_1.graphEdgeConditionKey)(condition));
        default:
            return false;
    }
}
function detectHiddenReachabilityIssues(input) {
    const findings = [];
    const now = input.now ?? new Date();
    const staleWindow = input.staleEdgeWindowMs ?? narrativeDeadEnd_js_1.DEFAULT_STALE_EDGE_WINDOW_MS;
    for (const row of input.subjects) {
        const graph = row.branchGraph;
        if (!graph)
            continue;
        const isDraftSubject = row.presenceState === contentPresence_js_1.ContentRevelationStates.DRAFT;
        if (isDraftSubject)
            continue;
        const isRecentlyEdited = now.getTime() - row.updatedAt.getTime() < staleWindow;
        const activationEntryIds = (0, narrativeBranchAnalysis_js_1.resolveActivationEntryNodeIds)(graph, row.activeNodeId);
        if (activationEntryIds.length === 0)
            continue;
        const dedupedEdges = (0, narrativeBranchAnalysis_js_1.dedupeBranchEdges)(graph.edges);
        const activationReachable = (0, narrativeBranchAnalysis_js_1.bfsReachable)(activationEntryIds, dedupedEdges, (edge) => isBranchConditionSatisfiable(edge.condition, input.conditionIndex));
        const explicitActivationRoots = new Set(graph.entryNodeIds ?? []);
        for (const node of graph.nodes) {
            if (node.kind !== narrativeBranch_js_1.BranchNodeKinds.HIDDEN)
                continue;
            if (explicitActivationRoots.has(node.id))
                continue;
            if (activationReachable.has(node.id))
                continue;
            findings.push({
                ruleId: 'hidden_no_activation_path',
                issueCategory: 'structural',
                issueType: 'narrative_unreachable_hidden',
                severity: isRecentlyEdited ? 'info' : 'warning',
                subjectPageId: row.subjectPageId,
                branchNodeId: node.id,
                messageParts: {
                    subjectTitle: row.subjectTitle,
                    nodeLabel: node.label,
                    branchNodeId: node.id,
                },
            });
        }
    }
    return findings;
}
//# sourceMappingURL=narrativeHiddenReachability.js.map