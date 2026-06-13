"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONNECTIVITY_MAX_DEPTH = exports.EDGE_CONNECTIVITY_WEIGHT = void 0;
exports.computeConnectivityScore = computeConnectivityScore;
exports.isNarrativelyConnected = isNarrativelyConnected;
exports.hasNonParentNarrativeEdge = hasNonParentNarrativeEdge;
exports.hasThreadGraphEdge = hasThreadGraphEdge;
exports.hasChronologyEdge = hasChronologyEdge;
/**
 * Layer 4 — weighted narrative connectivity traversal.
 */
const entityGraph_js_1 = require("./entityGraph.js");
const entityGraphQuery_js_1 = require("./entityGraphQuery.js");
const entityGraph_js_2 = require("./entityGraph.js");
exports.EDGE_CONNECTIVITY_WEIGHT = {
    [entityGraph_js_1.EntityRelationKinds.QUEST_GIVER]: 'strong',
    [entityGraph_js_1.EntityRelationKinds.QUEST_FACTION]: 'strong',
    [entityGraph_js_1.EntityRelationKinds.THREAD_RELATED]: 'strong',
    [entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF]: 'strong',
    [entityGraph_js_1.EntityRelationKinds.CALENDAR_PREREQUISITE]: 'strong',
    [entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.ORG_LEADER]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.ORG_DIPLOMATIC]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.WIKI_REFERENCE]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.LOCATION_REGION]: 'structural',
    [entityGraph_js_1.EntityRelationKinds.LOCATION_RELATED]: 'structural',
    [entityGraph_js_1.EntityRelationKinds.LOCATION_MAP]: 'structural',
    [entityGraph_js_1.EntityRelationKinds.PAGE_PARENT]: 'structural',
    [entityGraph_js_1.EntityRelationKinds.MAP_TARGETS]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.ORG_PARENT]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.ORG_HQ]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.CHARACTER_LINEAGE]: 'weak',
    [entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL]: 'strong',
};
const WEIGHT_SCORE = {
    strong: 3,
    weak: 1,
    structural: 0.5,
};
exports.CONNECTIVITY_MAX_DEPTH = 6;
function edgeWeightScore(kind) {
    if (kind === entityGraph_js_1.EntityRelationKinds.PAGE_PARENT)
        return null;
    const weight = exports.EDGE_CONNECTIVITY_WEIGHT[kind] ?? 'weak';
    return { weight, score: WEIGHT_SCORE[weight] };
}
function isActiveTargetNode(nodeKey, activeTargetPageIds, calendarEventIds) {
    const parsed = nodeKey.split(':');
    if (parsed.length < 2)
        return false;
    const entityType = parsed[0];
    const entityId = parsed.slice(1).join(':');
    if (entityType === 'wiki_page') {
        return activeTargetPageIds.has(entityId);
    }
    if (entityType === 'calendar_event' && calendarEventIds) {
        return calendarEventIds.has(entityId);
    }
    return false;
}
function computeConnectivityScore(input) {
    const index = (0, entityGraphQuery_js_1.buildAdjacencyIndex)(input.edges);
    const startKey = `wiki_page:${input.startPageId}`;
    const maxDepth = input.maxDepth ?? exports.CONNECTIVITY_MAX_DEPTH;
    let strongScore = 0;
    let weakScore = 0;
    let reachedActiveTarget = activeTargetPageIdsHas(input.activeTargetPageIds, input.startPageId);
    const visited = new Set([startKey]);
    const queue = [{ key: startKey, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.depth >= maxDepth)
            continue;
        const nodeRef = (0, entityGraph_js_2.parseNodeRefKey)(current.key);
        if (!nodeRef)
            continue;
        for (const edge of (0, entityGraphQuery_js_1.neighbors)(index, nodeRef, { direction: 'both' })) {
            const other = (0, entityGraph_js_1.nodeRefKey)(edge.source) === current.key
                ? (0, entityGraph_js_1.nodeRefKey)(edge.target)
                : (0, entityGraph_js_1.nodeRefKey)(edge.source);
            if (visited.has(other))
                continue;
            const weightInfo = edgeWeightScore(edge.relationKind);
            if (!weightInfo)
                continue;
            visited.add(other);
            if (weightInfo.weight === 'strong') {
                strongScore += weightInfo.score;
            }
            else if (weightInfo.weight === 'weak') {
                weakScore += weightInfo.score;
            }
            else {
                weakScore += weightInfo.score * 0.5;
            }
            if (isActiveTargetNode(other, input.activeTargetPageIds, input.calendarEventIds)) {
                reachedActiveTarget = true;
            }
            queue.push({ key: other, depth: current.depth + 1 });
        }
    }
    return { strongScore, weakScore, reachedActiveTarget };
}
function activeTargetPageIdsHas(set, pageId) {
    return set.has(pageId);
}
function isNarrativelyConnected(score) {
    if (score.strongScore >= 3)
        return true;
    if (score.strongScore + score.weakScore >= 4 && score.reachedActiveTarget) {
        return true;
    }
    return false;
}
function hasNonParentNarrativeEdge(pageId, edges) {
    const key = `wiki_page:${pageId}`;
    for (const edge of edges) {
        if (edge.relationKind === entityGraph_js_1.EntityRelationKinds.PAGE_PARENT)
            continue;
        if ((0, entityGraph_js_1.nodeRefKey)(edge.source) === key || (0, entityGraph_js_1.nodeRefKey)(edge.target) === key) {
            return true;
        }
    }
    return false;
}
function hasThreadGraphEdge(pageId, edges) {
    const key = `wiki_page:${pageId}`;
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.THREAD_RELATED &&
            edge.relationKind !== entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF) {
            continue;
        }
        if ((0, entityGraph_js_1.nodeRefKey)(edge.source) === key || (0, entityGraph_js_1.nodeRefKey)(edge.target) === key) {
            return true;
        }
    }
    return false;
}
function hasChronologyEdge(pageId, edges) {
    const key = `wiki_page:${pageId}`;
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CALENDAR_PREREQUISITE)
            continue;
        if ((0, entityGraph_js_1.nodeRefKey)(edge.source) === key || (0, entityGraph_js_1.nodeRefKey)(edge.target) === key) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=narrativeConnectivity.js.map