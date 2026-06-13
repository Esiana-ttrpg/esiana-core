"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdjacencyIndex = buildAdjacencyIndex;
exports.neighbors = neighbors;
exports.traverseBfs = traverseBfs;
exports.findCycles = findCycles;
exports.findOrphans = findOrphans;
exports.shortestPath = shortestPath;
exports.subgraph = subgraph;
exports.attachAdjacency = attachAdjacency;
exports.collectReachableNodeKeys = collectReachableNodeKeys;
exports.uniqueNodeRefsFromEdges = uniqueNodeRefsFromEdges;
exports.nodeRefsFromKeys = nodeRefsFromKeys;
/**
 * Pure graph analysis utilities over in-memory snapshots (Path B — GraphAnalysisSnapshot).
 */
const entityGraph_js_1 = require("./entityGraph.js");
function buildAdjacencyIndex(edges) {
    const outbound = new Map();
    const inbound = new Map();
    for (const edge of edges) {
        const sourceKey = (0, entityGraph_js_1.nodeRefKey)(edge.source);
        const targetKey = (0, entityGraph_js_1.nodeRefKey)(edge.target);
        const out = outbound.get(sourceKey) ?? [];
        out.push(edge);
        outbound.set(sourceKey, out);
        const inn = inbound.get(targetKey) ?? [];
        inn.push(edge);
        inbound.set(targetKey, inn);
    }
    return { outbound, inbound };
}
function edgeMatchesKinds(edge, kinds) {
    if (!kinds || kinds.length === 0)
        return true;
    return kinds.includes(edge.relationKind);
}
function neighbors(index, node, opts = {}) {
    const key = (0, entityGraph_js_1.nodeRefKey)(node);
    const direction = opts.direction ?? 'both';
    const rows = [];
    if (direction === 'outbound' || direction === 'both') {
        for (const edge of index.outbound.get(key) ?? []) {
            if (edgeMatchesKinds(edge, opts.kinds))
                rows.push(edge);
        }
    }
    if (direction === 'inbound' || direction === 'both') {
        for (const edge of index.inbound.get(key) ?? []) {
            if (edgeMatchesKinds(edge, opts.kinds))
                rows.push(edge);
        }
    }
    return rows;
}
function traverseBfs(index, start, maxDepth, predicate) {
    const startKey = (0, entityGraph_js_1.nodeRefKey)(start);
    const visited = new Set([startKey]);
    const edges = [];
    const depthByNode = new Map([[startKey, 0]]);
    const queue = [{ node: start, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.depth >= maxDepth)
            continue;
        for (const edge of neighbors(index, current.node, { direction: 'both' })) {
            if (predicate && !predicate(edge, current.depth + 1))
                continue;
            const other = (0, entityGraph_js_1.nodeRefKey)(edge.source) === (0, entityGraph_js_1.nodeRefKey)(current.node) ? edge.target : edge.source;
            const otherKey = (0, entityGraph_js_1.nodeRefKey)(other);
            edges.push(edge);
            if (!visited.has(otherKey)) {
                visited.add(otherKey);
                depthByNode.set(otherKey, current.depth + 1);
                if (current.depth + 1 < maxDepth) {
                    queue.push({ node: other, depth: current.depth + 1 });
                }
            }
        }
    }
    return { visited, edges, depthByNode };
}
function findCycles(edges, kindFilter) {
    const filtered = kindFilter?.length
        ? edges.filter((e) => kindFilter.includes(e.relationKind))
        : [...edges];
    const index = buildAdjacencyIndex(filtered);
    const findings = [];
    const visited = new Set();
    const stack = new Set();
    const path = [];
    const dfs = (key, kind) => {
        visited.add(key);
        stack.add(key);
        path.push(key);
        for (const edge of index.outbound.get(key) ?? []) {
            if (edge.relationKind !== kind)
                continue;
            const nextKey = (0, entityGraph_js_1.nodeRefKey)(edge.target);
            if (!visited.has(nextKey)) {
                dfs(nextKey, kind);
            }
            else if (stack.has(nextKey)) {
                const cycleStart = path.indexOf(nextKey);
                if (cycleStart >= 0) {
                    findings.push({
                        kind,
                        nodeIds: path.slice(cycleStart).map((k) => k.split(':').slice(1).join(':')),
                    });
                }
            }
        }
        path.pop();
        stack.delete(key);
    };
    const kinds = kindFilter?.length
        ? [...kindFilter]
        : [...new Set(filtered.map((e) => e.relationKind))];
    for (const kind of kinds) {
        visited.clear();
        stack.clear();
        for (const edge of filtered) {
            if (edge.relationKind !== kind)
                continue;
            const startKey = (0, entityGraph_js_1.nodeRefKey)(edge.source);
            if (!visited.has(startKey)) {
                dfs(startKey, kind);
            }
        }
    }
    return findings;
}
function findOrphans(narrativeNodes, edges, opts) {
    const exclude = new Set(opts?.excludeKinds ?? [entityGraph_js_1.EntityRelationKinds.PAGE_PARENT]);
    const findings = [];
    for (const node of narrativeNodes) {
        const key = (0, entityGraph_js_1.nodeRefKey)(node);
        const hasEdge = edges.some((edge) => {
            if (exclude.has(edge.relationKind))
                return false;
            return (0, entityGraph_js_1.nodeRefKey)(edge.source) === key || (0, entityGraph_js_1.nodeRefKey)(edge.target) === key;
        });
        if (!hasEdge) {
            findings.push({ node });
        }
    }
    return findings;
}
function shortestPath(index, from, to, opts) {
    const fromKey = (0, entityGraph_js_1.nodeRefKey)(from);
    const toKey = (0, entityGraph_js_1.nodeRefKey)(to);
    if (fromKey === toKey) {
        return { found: true, edges: [], nodeKeys: [fromKey] };
    }
    const maxDepth = opts?.maxDepth ?? 12;
    const visited = new Set([fromKey]);
    const prev = new Map();
    const queue = [{ node: from, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.depth >= maxDepth)
            continue;
        for (const edge of neighbors(index, current.node, {
            direction: 'both',
            kinds: opts?.kinds,
        })) {
            const other = (0, entityGraph_js_1.nodeRefKey)(edge.source) === (0, entityGraph_js_1.nodeRefKey)(current.node) ? edge.target : edge.source;
            const otherKey = (0, entityGraph_js_1.nodeRefKey)(other);
            if (visited.has(otherKey))
                continue;
            visited.add(otherKey);
            prev.set(otherKey, { key: (0, entityGraph_js_1.nodeRefKey)(current.node), edge });
            if (otherKey === toKey) {
                const nodeKeys = [toKey];
                const edges = [];
                let walk = toKey;
                while (walk !== fromKey) {
                    const step = prev.get(walk);
                    if (!step)
                        break;
                    edges.unshift(step.edge);
                    nodeKeys.unshift(step.key);
                    walk = step.key;
                }
                return { found: true, edges, nodeKeys };
            }
            queue.push({ node: other, depth: current.depth + 1 });
        }
    }
    return { found: false, edges: [], nodeKeys: [] };
}
function subgraph(nodeIds, edges) {
    const allowed = new Set(nodeIds);
    return edges.filter((edge) => allowed.has(edge.source.entityId) && allowed.has(edge.target.entityId));
}
function attachAdjacency(snapshot) {
    return {
        ...snapshot,
        adjacency: buildAdjacencyIndex(snapshot.edges),
    };
}
function collectReachableNodeKeys(index, roots, maxDepth) {
    const reachable = new Set();
    for (const root of roots) {
        const { visited } = traverseBfs(index, root, maxDepth);
        for (const key of visited)
            reachable.add(key);
    }
    return reachable;
}
function uniqueNodeRefsFromEdges(edges) {
    const map = new Map();
    for (const edge of edges) {
        map.set((0, entityGraph_js_1.nodeRefKey)(edge.source), edge.source);
        map.set((0, entityGraph_js_1.nodeRefKey)(edge.target), edge.target);
    }
    return [...map.values()];
}
function nodeRefsFromKeys(keys) {
    const out = [];
    for (const key of keys) {
        const ref = (0, entityGraph_js_1.parseNodeRefKey)(key);
        if (ref)
            out.push(ref);
    }
    return out;
}
//# sourceMappingURL=entityGraphQuery.js.map