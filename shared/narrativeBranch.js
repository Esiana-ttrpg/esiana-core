"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativeBranchValidationError = exports.BranchNodeKinds = exports.MAX_BRANCH_EDGES = exports.MAX_BRANCH_NODES = exports.NARRATIVE_BRANCH_VERSION = void 0;
exports.parseNarrativeBranchGraph = parseNarrativeBranchGraph;
exports.assertValidBranchGraph = assertValidBranchGraph;
exports.allowedNextBranchNodes = allowedNextBranchNodes;
exports.NARRATIVE_BRANCH_VERSION = 'narrative-branch-v1';
exports.MAX_BRANCH_NODES = 12;
exports.MAX_BRANCH_EDGES = 24;
exports.BranchNodeKinds = {
    OUTCOME: 'outcome',
    HIDDEN: 'hidden',
    FAILURE: 'failure',
    MERGE: 'merge',
};
class NarrativeBranchValidationError extends Error {
    code = 'INVALID_BRANCH_GRAPH';
    constructor(message) {
        super(message);
        this.name = 'NarrativeBranchValidationError';
    }
}
exports.NarrativeBranchValidationError = NarrativeBranchValidationError;
function parseNarrativeBranchGraph(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    if (obj.version !== exports.NARRATIVE_BRANCH_VERSION)
        return null;
    if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges))
        return null;
    const nodes = [];
    for (const entry of obj.nodes) {
        if (!entry || typeof entry !== 'object')
            continue;
        const node = entry;
        if (typeof node.id !== 'string' || typeof node.label !== 'string')
            continue;
        const kind = node.kind;
        if (kind !== exports.BranchNodeKinds.OUTCOME &&
            kind !== exports.BranchNodeKinds.HIDDEN &&
            kind !== exports.BranchNodeKinds.FAILURE &&
            kind !== exports.BranchNodeKinds.MERGE) {
            continue;
        }
        nodes.push({ id: node.id, label: node.label, kind });
    }
    const edges = [];
    for (const entry of obj.edges) {
        if (!entry || typeof entry !== 'object')
            continue;
        const edge = entry;
        if (typeof edge.from !== 'string' || typeof edge.to !== 'string')
            continue;
        edges.push({
            from: edge.from,
            to: edge.to,
            condition: edge.condition,
        });
    }
    if (nodes.length === 0)
        return null;
    const entryNodeIds = [];
    if (Array.isArray(obj.entryNodeIds)) {
        const nodeIds = new Set(nodes.map((n) => n.id));
        for (const entry of obj.entryNodeIds) {
            if (typeof entry === 'string' && nodeIds.has(entry)) {
                entryNodeIds.push(entry);
            }
        }
    }
    return {
        version: exports.NARRATIVE_BRANCH_VERSION,
        nodes,
        edges,
        ...(entryNodeIds.length > 0 ? { entryNodeIds } : {}),
    };
}
function assertValidBranchGraph(graph) {
    if (graph.nodes.length > exports.MAX_BRANCH_NODES) {
        throw new NarrativeBranchValidationError(`Branch graph exceeds ${exports.MAX_BRANCH_NODES} nodes`);
    }
    if (graph.edges.length > exports.MAX_BRANCH_EDGES) {
        throw new NarrativeBranchValidationError(`Branch graph exceeds ${exports.MAX_BRANCH_EDGES} edges`);
    }
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    for (const edge of graph.edges) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
            throw new NarrativeBranchValidationError('Branch edge references unknown node');
        }
    }
    if (graph.entryNodeIds?.length) {
        for (const entryId of graph.entryNodeIds) {
            if (!nodeIds.has(entryId)) {
                throw new NarrativeBranchValidationError('Branch entryNodeIds references unknown node');
            }
        }
    }
}
function allowedNextBranchNodes(graph, activeNodeId) {
    if (!activeNodeId) {
        return graph.nodes.filter((n) => n.kind === exports.BranchNodeKinds.OUTCOME);
    }
    const outgoing = graph.edges.filter((e) => e.from === activeNodeId);
    const targetIds = new Set(outgoing.map((e) => e.to));
    return graph.nodes.filter((n) => targetIds.has(n.id));
}
//# sourceMappingURL=narrativeBranch.js.map