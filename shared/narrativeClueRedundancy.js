"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectClueRedundancyIssues = detectClueRedundancyIssues;
exports.countSpofClues = countSpofClues;
const narrativeBranch_js_1 = require("./narrativeBranch.js");
const narrativeBranchAnalysis_js_1 = require("./narrativeBranchAnalysis.js");
const narrativeHiddenReachability_js_1 = require("./narrativeHiddenReachability.js");
function isEdgeTraversable(conditionIndex) {
    return (edge) => (0, narrativeHiddenReachability_js_1.isBranchConditionSatisfiable)(edge.condition, conditionIndex);
}
function terminalNodeIds(graph) {
    const outbound = new Map();
    for (const node of graph.nodes)
        outbound.set(node.id, 0);
    for (const edge of graph.edges) {
        outbound.set(edge.from, (outbound.get(edge.from) ?? 0) + 1);
    }
    return graph.nodes
        .filter((n) => (outbound.get(n.id) ?? 0) === 0 ||
        n.kind === narrativeBranch_js_1.BranchNodeKinds.OUTCOME ||
        n.kind === narrativeBranch_js_1.BranchNodeKinds.FAILURE ||
        n.kind === narrativeBranch_js_1.BranchNodeKinds.MERGE)
        .map((n) => n.id);
}
function reverseReachable(targetNodeId, edges, isTraversable) {
    const reachable = new Set([targetNodeId]);
    const queue = [targetNodeId];
    while (queue.length > 0) {
        const id = queue.shift();
        for (const edge of edges) {
            if (edge.to !== id)
                continue;
            if (!isTraversable(edge))
                continue;
            if (reachable.has(edge.from))
                continue;
            reachable.add(edge.from);
            queue.push(edge.from);
        }
    }
    return reachable;
}
function countIndependentPredecessorFrontiers(targetNodeId, entryNodeIds, edges, isTraversable) {
    const reverseFromTarget = reverseReachable(targetNodeId, edges, isTraversable);
    let frontierCount = 0;
    for (const entry of entryNodeIds) {
        if (!reverseFromTarget.has(entry))
            continue;
        const forward = (0, narrativeBranchAnalysis_js_1.bfsReachable)([entry], edges, isTraversable);
        if (!forward.has(targetNodeId))
            continue;
        frontierCount += 1;
    }
    return frontierCount;
}
function findArticulationBottlenecks(graph, entryNodeIds, isTraversable) {
    const edges = (0, narrativeBranchAnalysis_js_1.dedupeBranchEdges)(graph.edges);
    const terminals = terminalNodeIds(graph);
    if (terminals.length === 0 || entryNodeIds.length === 0)
        return [];
    const allReachable = (0, narrativeBranchAnalysis_js_1.bfsReachable)(entryNodeIds, edges, isTraversable);
    const reachableTerminals = terminals.filter((t) => allReachable.has(t));
    if (reachableTerminals.length === 0)
        return [];
    const bottlenecks = [];
    for (const node of graph.nodes) {
        if (!allReachable.has(node.id))
            continue;
        if (entryNodeIds.includes(node.id))
            continue;
        let stillReachableAll = true;
        for (const terminal of reachableTerminals) {
            const withoutNode = (0, narrativeBranchAnalysis_js_1.bfsReachable)(entryNodeIds, edges.filter((e) => e.from !== node.id && e.to !== node.id), isTraversable);
            if (!withoutNode.has(terminal)) {
                stillReachableAll = false;
                break;
            }
        }
        if (!stillReachableAll) {
            bottlenecks.push(node.id);
        }
    }
    return bottlenecks;
}
function clueOnSolePath(subject, graph, entryNodeIds, input, isTraversable) {
    const findings = [];
    const edges = (0, narrativeBranchAnalysis_js_1.dedupeBranchEdges)(graph.edges);
    const terminals = terminalNodeIds(graph);
    for (const terminal of terminals) {
        const independentPaths = countIndependentPredecessorFrontiers(terminal, entryNodeIds, edges, isTraversable);
        if (independentPaths >= 2)
            continue;
        for (const edge of edges) {
            const condition = edge.condition;
            if (condition?.type === 'graph_edge' &&
                input.clueThreadPageIds.has(condition.sourcePageId)) {
                findings.push({
                    ruleId: 'clue_no_alternative_path',
                    issueCategory: 'structural',
                    issueType: 'narrative_clue_single_point_of_failure',
                    severity: 'warning',
                    subjectPageId: subject.subjectPageId,
                    branchNodeId: edge.to,
                    clueThreadPageId: condition.sourcePageId,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        terminalId: terminal,
                    },
                });
            }
            if (condition?.type === 'lifecycle' &&
                input.threadKindByPageId.get(condition.subjectId) === 'clue') {
                findings.push({
                    ruleId: 'clue_no_alternative_path',
                    issueCategory: 'structural',
                    issueType: 'narrative_clue_single_point_of_failure',
                    severity: 'warning',
                    subjectPageId: subject.subjectPageId,
                    branchNodeId: edge.to,
                    clueThreadPageId: condition.subjectId,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        terminalId: terminal,
                    },
                });
            }
        }
    }
    return findings;
}
function detectClueRedundancyIssues(input) {
    const findings = [];
    const isTraversable = isEdgeTraversable(input.conditionIndex);
    for (const subject of input.subjects) {
        const graph = subject.branchGraph;
        if (!graph || graph.nodes.length === 0)
            continue;
        const entryNodeIds = (0, narrativeBranchAnalysis_js_1.resolveEntryNodeIds)(graph, subject.activeNodeId);
        if (entryNodeIds.length === 0)
            continue;
        findings.push(...clueOnSolePath(subject, graph, entryNodeIds, input, isTraversable));
        const bottlenecks = findArticulationBottlenecks(graph, entryNodeIds, isTraversable);
        for (const nodeId of bottlenecks) {
            const node = graph.nodes.find((n) => n.id === nodeId);
            findings.push({
                ruleId: 'progression_articulation_point',
                issueCategory: 'structural',
                issueType: 'narrative_progression_bottleneck',
                severity: 'info',
                subjectPageId: subject.subjectPageId,
                branchNodeId: nodeId,
                messageParts: {
                    subjectTitle: subject.subjectTitle,
                    nodeLabel: node?.label ?? nodeId,
                },
            });
        }
    }
    return findings;
}
function countSpofClues(findings) {
    return findings.filter((f) => f.ruleId === 'clue_no_alternative_path').length;
}
//# sourceMappingURL=narrativeClueRedundancy.js.map