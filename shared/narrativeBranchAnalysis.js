"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupeBranchEdges = dedupeBranchEdges;
exports.bfsReachable = bfsReachable;
exports.resolveEntryNodeIds = resolveEntryNodeIds;
exports.resolveActivationEntryNodeIds = resolveActivationEntryNodeIds;
exports.liveGraphEdgeKey = liveGraphEdgeKey;
exports.graphEdgeConditionKey = graphEdgeConditionKey;
/**
 * Shared branch-graph traversal helpers (Layer 4 diagnostics).
 */
const narrativeBranch_js_1 = require("./narrativeBranch.js");
function dedupeBranchEdges(edges) {
    const seen = new Set();
    const out = [];
    for (const edge of edges) {
        const key = `${edge.from}→${edge.to}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(edge);
    }
    return out;
}
function bfsReachable(entryNodeIds, edges, isEdgeTraversable) {
    const reachable = new Set();
    const queue = [...entryNodeIds];
    while (queue.length > 0) {
        const id = queue.shift();
        if (reachable.has(id))
            continue;
        reachable.add(id);
        for (const edge of edges) {
            if (edge.from !== id)
                continue;
            if (isEdgeTraversable && !isEdgeTraversable(edge))
                continue;
            queue.push(edge.to);
        }
    }
    return reachable;
}
function resolveEntryNodeIds(graph, activeNodeId) {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    if (graph.entryNodeIds?.length) {
        return [...graph.entryNodeIds];
    }
    if (activeNodeId && nodeIds.has(activeNodeId)) {
        return [activeNodeId];
    }
    const inbound = new Map();
    for (const node of graph.nodes)
        inbound.set(node.id, 0);
    for (const edge of graph.edges) {
        inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
    }
    const structuralRoots = graph.nodes
        .filter((n) => (inbound.get(n.id) ?? 0) === 0)
        .map((n) => n.id);
    const outcomeRoots = structuralRoots.filter((id) => nodesById.get(id)?.kind === narrativeBranch_js_1.BranchNodeKinds.OUTCOME);
    const candidates = outcomeRoots.length > 0 ? outcomeRoots : structuralRoots;
    if (candidates.length === 0) {
        const outcomes = graph.nodes
            .filter((n) => n.kind === narrativeBranch_js_1.BranchNodeKinds.OUTCOME)
            .map((n) => n.id)
            .sort();
        return outcomes.length > 0 ? [outcomes[0]] : [];
    }
    if (candidates.length === 1)
        return candidates;
    return [candidates.sort()[0]];
}
function resolveActivationEntryNodeIds(graph, activeNodeId) {
    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    return resolveEntryNodeIds(graph, activeNodeId).filter((id) => nodesById.get(id)?.kind === narrativeBranch_js_1.BranchNodeKinds.OUTCOME);
}
function liveGraphEdgeKey(sourcePageId, targetPageId, relationKind) {
    return `${sourcePageId}:${targetPageId}:${relationKind}`;
}
function graphEdgeConditionKey(condition) {
    return liveGraphEdgeKey(condition.sourcePageId, condition.targetPageId, condition.kind);
}
//# sourceMappingURL=narrativeBranchAnalysis.js.map