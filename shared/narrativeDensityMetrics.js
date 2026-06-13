"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DENSITY_THRESHOLDS = void 0;
exports.computeNarrativeDensityMetrics = computeNarrativeDensityMetrics;
exports.detectDensityThresholdIssues = detectDensityThresholdIssues;
/**
 * Layer 4 — narrative density metrics (pure).
 */
const narrativeBranch_js_1 = require("./narrativeBranch.js");
const narrativeBranchAnalysis_js_1 = require("./narrativeBranchAnalysis.js");
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const narrativeClueRedundancy_js_1 = require("./narrativeClueRedundancy.js");
exports.DENSITY_THRESHOLDS = {
    maxBranchDepth: 6,
    cluesPerActiveQuest: 8,
    clusterMaxBranchDepth: 8,
    openAuthoredThreads: 25,
};
function maxDepthFromEntries(graph, activeNodeId) {
    const entryNodeIds = (0, narrativeBranchAnalysis_js_1.resolveEntryNodeIds)(graph, activeNodeId);
    if (entryNodeIds.length === 0)
        return 0;
    const reachable = (0, narrativeBranchAnalysis_js_1.bfsReachable)(entryNodeIds, graph.edges);
    let maxDepth = 0;
    for (const entry of entryNodeIds) {
        const queue = [{ id: entry, depth: 0 }];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id))
                continue;
            visited.add(current.id);
            maxDepth = Math.max(maxDepth, current.depth);
            for (const edge of graph.edges) {
                if (edge.from === current.id && reachable.has(edge.to)) {
                    queue.push({ id: edge.to, depth: current.depth + 1 });
                }
            }
        }
    }
    return maxDepth;
}
function countTerminals(graph) {
    const outbound = new Map();
    for (const node of graph.nodes)
        outbound.set(node.id, 0);
    for (const edge of graph.edges) {
        outbound.set(edge.from, (outbound.get(edge.from) ?? 0) + 1);
    }
    return graph.nodes.filter((n) => (outbound.get(n.id) ?? 0) === 0 ||
        n.kind === narrativeBranch_js_1.BranchNodeKinds.OUTCOME ||
        n.kind === narrativeBranch_js_1.BranchNodeKinds.FAILURE).length;
}
function computeNarrativeDensityMetrics(input) {
    const branchingDepth = [];
    let terminalCount = 0;
    let activeQuests = 0;
    for (const subject of input.subjects) {
        if (subject.subjectKind === 'quest') {
            if (subject.lifecycleState === narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE) {
                activeQuests += 1;
            }
        }
        const graph = subject.branchGraph;
        if (!graph)
            continue;
        terminalCount += countTerminals(graph);
        branchingDepth.push({
            subjectPageId: subject.subjectPageId,
            maxDepth: maxDepthFromEntries(graph, subject.activeNodeId),
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
        });
    }
    const openAuthoredThreads = input.authoredThreads.filter((t) => t.threadStatus === 'OPEN' || t.threadStatus === 'DORMANT').length;
    const byKind = {};
    const byStatus = {};
    for (const thread of input.authoredThreads) {
        if (thread.threadStatus === 'OPEN' || thread.threadStatus === 'DORMANT') {
            byKind[thread.threadKind] = (byKind[thread.threadKind] ?? 0) + 1;
            byStatus[thread.threadStatus] = (byStatus[thread.threadStatus] ?? 0) + 1;
        }
    }
    const clusterMap = new Map();
    for (const subject of input.subjects) {
        if (subject.subjectKind !== 'quest')
            continue;
        const parentId = input.questParentById.get(subject.subjectPageId) ?? 'root';
        const label = input.questTitleById.get(parentId) ??
            (parentId === 'root' ? 'Top-level quests' : parentId);
        const entry = clusterMap.get(parentId) ?? {
            label,
            questCount: 0,
            activeThreadCount: 0,
            maxBranchDepth: 0,
        };
        entry.questCount += 1;
        const depth = subject.branchGraph
            ? maxDepthFromEntries(subject.branchGraph, subject.activeNodeId)
            : 0;
        entry.maxBranchDepth = Math.max(entry.maxBranchDepth, depth);
        clusterMap.set(parentId, entry);
    }
    for (const thread of input.authoredThreads) {
        if (!thread.parentQuestClusterId)
            continue;
        const entry = clusterMap.get(thread.parentQuestClusterId);
        if (entry && (thread.threadStatus === 'OPEN' || thread.threadStatus === 'DORMANT')) {
            entry.activeThreadCount += 1;
        }
    }
    const spofClueCount = (0, narrativeClueRedundancy_js_1.countSpofClues)(input.clueFindings);
    const bottleneckCount = input.clueFindings.filter((f) => f.ruleId === 'progression_articulation_point').length;
    return {
        authored: {
            branchingDepth,
            clueDensity: {
                clueThreadCount: input.clueThreadCount,
                cluesPerActiveQuest: activeQuests > 0 ? input.clueThreadCount / activeQuests : 0,
                spofClueCount,
            },
            bottleneckCount,
            terminalCount,
        },
        worldState: {
            unresolvedThreadCount: {
                total: openAuthoredThreads,
                byKind,
                byStatus,
            },
            activeFactionCount: input.activeFactionCount,
            narrativeEntityCount: input.narrativeEntityCount,
            chronologyEventCount: input.chronologyEventCount,
            campaignTotals: {
                activeQuests,
                openAuthoredThreads,
            },
        },
        narrativeClusterComplexity: [...clusterMap.entries()].map(([clusterId, row]) => ({
            clusterId,
            label: row.label,
            questCount: row.questCount,
            activeThreadCount: row.activeThreadCount,
            maxBranchDepth: row.maxBranchDepth,
        })),
    };
}
function detectDensityThresholdIssues(metrics) {
    const findings = [];
    for (const entry of metrics.authored.branchingDepth) {
        if (entry.maxDepth > exports.DENSITY_THRESHOLDS.maxBranchDepth) {
            findings.push({
                ruleId: 'density_high_branching',
                issueType: 'narrative_density_high_branching',
                severity: 'warning',
                subjectPageId: entry.subjectPageId,
                messageParts: { maxDepth: String(entry.maxDepth) },
            });
        }
    }
    if (metrics.authored.clueDensity.cluesPerActiveQuest >
        exports.DENSITY_THRESHOLDS.cluesPerActiveQuest) {
        findings.push({
            ruleId: 'density_clue_overload',
            issueType: 'narrative_density_clue_overload',
            severity: 'info',
            messageParts: {
                count: String(metrics.authored.clueDensity.cluesPerActiveQuest),
            },
        });
    }
    if (metrics.authored.clueDensity.spofClueCount > 0) {
        findings.push({
            ruleId: 'density_clue_spof',
            issueType: 'narrative_density_clue_spof',
            severity: 'warning',
            messageParts: {
                count: String(metrics.authored.clueDensity.spofClueCount),
            },
        });
    }
    for (const cluster of metrics.narrativeClusterComplexity) {
        if (cluster.maxBranchDepth > exports.DENSITY_THRESHOLDS.clusterMaxBranchDepth) {
            findings.push({
                ruleId: 'density_cluster_complexity',
                issueType: 'narrative_density_cluster_complexity',
                severity: 'info',
                clusterId: cluster.clusterId,
                messageParts: {
                    label: cluster.label,
                    maxBranchDepth: String(cluster.maxBranchDepth),
                },
            });
        }
    }
    if (metrics.worldState.campaignTotals.openAuthoredThreads >
        exports.DENSITY_THRESHOLDS.openAuthoredThreads) {
        findings.push({
            ruleId: 'density_thread_overload',
            issueType: 'narrative_density_thread_overload',
            severity: 'info',
            messageParts: {
                count: String(metrics.worldState.campaignTotals.openAuthoredThreads),
            },
        });
    }
    return findings;
}
//# sourceMappingURL=narrativeDensityMetrics.js.map