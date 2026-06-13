"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORYBOARD_MODE_LABELS = exports.STORYBOARD_MODE_RELATION_KINDS = exports.STORYBOARD_EDGE_PROVENANCE = void 0;
exports.buildModeLegend = buildModeLegend;
exports.deriveStoryboardEdges = deriveStoryboardEdges;
exports.assertStoryboardEdgeProvenance = assertStoryboardEdgeProvenance;
/**
 * Layer 5 — derive storyboard edges from entity graph with explainable provenance.
 */
const entityGraph_js_1 = require("./entityGraph.js");
/** Canonical metadata field → human explanation for each relation kind used on the storyboard. */
exports.STORYBOARD_EDGE_PROVENANCE = {
    [entityGraph_js_1.EntityRelationKinds.SCENE_FOLLOWS]: {
        derivationSource: 'followsScenePageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{source} follows {target} in scene sequence',
        editable: true,
        editField: 'followsScenePageIds',
    },
    [entityGraph_js_1.EntityRelationKinds.SCENE_THREAD]: {
        derivationSource: 'linkedThreadPageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{source} links thread {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.SCENE_CLUE]: {
        derivationSource: 'linkedCluePageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{source} surfaces clue {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.SCENE_QUEST]: {
        derivationSource: 'linkedQuestPageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{source} tied to quest {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.OBJECTIVE_SCENE]: {
        derivationSource: 'linkedObjectivePageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{source} advances objective {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.SCENE_PARTICIPANT]: {
        derivationSource: 'participantPageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{target} participates in {source}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.SCENE_LOCATION]: {
        derivationSource: 'locationPageId',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: '{source} set at {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.QUEST_OBJECTIVE]: {
        derivationSource: 'parentId',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: 'Quest {source} contains objective {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.THREAD_RELATED]: {
        derivationSource: 'relatedPageIds',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: 'Thread {source} related to {target}',
        editable: false,
    },
    [entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF]: {
        derivationSource: 'payoffPageId',
        derivationDomain: 'wiki_metadata',
        explanationTemplate: 'Thread {source} payoff at {target}',
        editable: false,
    },
};
exports.STORYBOARD_MODE_RELATION_KINDS = {
    arc_flow: [entityGraph_js_1.EntityRelationKinds.SCENE_FOLLOWS],
    investigation: [
        entityGraph_js_1.EntityRelationKinds.SCENE_CLUE,
        entityGraph_js_1.EntityRelationKinds.SCENE_THREAD,
        entityGraph_js_1.EntityRelationKinds.THREAD_RELATED,
        entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF,
    ],
    session_prep: [
        entityGraph_js_1.EntityRelationKinds.SCENE_FOLLOWS,
        entityGraph_js_1.EntityRelationKinds.SCENE_QUEST,
        entityGraph_js_1.EntityRelationKinds.OBJECTIVE_SCENE,
        entityGraph_js_1.EntityRelationKinds.QUEST_OBJECTIVE,
        entityGraph_js_1.EntityRelationKinds.SCENE_PARTICIPANT,
        entityGraph_js_1.EntityRelationKinds.SCENE_LOCATION,
    ],
    continuity: [
        entityGraph_js_1.EntityRelationKinds.SCENE_FOLLOWS,
        entityGraph_js_1.EntityRelationKinds.SCENE_THREAD,
        entityGraph_js_1.EntityRelationKinds.SCENE_CLUE,
        entityGraph_js_1.EntityRelationKinds.SCENE_QUEST,
        entityGraph_js_1.EntityRelationKinds.OBJECTIVE_SCENE,
        entityGraph_js_1.EntityRelationKinds.SCENE_PARTICIPANT,
        entityGraph_js_1.EntityRelationKinds.SCENE_LOCATION,
    ],
};
exports.STORYBOARD_MODE_LABELS = {
    arc_flow: 'Arc flow',
    investigation: 'Investigation',
    session_prep: 'Session prep',
    continuity: 'Continuity',
};
function graphNodeId(edge, end) {
    return end === 'source' ? edge.source.entityId : edge.target.entityId;
}
function formatExplanation(template, sourceTitle, targetTitle) {
    return template.replace('{source}', sourceTitle).replace('{target}', targetTitle);
}
function edgeVisualKind(relationKind) {
    if (relationKind === entityGraph_js_1.EntityRelationKinds.SCENE_FOLLOWS)
        return 'required';
    if (relationKind === entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF ||
        relationKind === entityGraph_js_1.EntityRelationKinds.OBJECTIVE_SCENE) {
        return 'branch';
    }
    return 'optional';
}
function buildModeLegend(activeMode) {
    const kinds = exports.STORYBOARD_MODE_RELATION_KINDS[activeMode];
    const labels = kinds
        .map((kind) => {
        const prov = exports.STORYBOARD_EDGE_PROVENANCE[kind];
        return prov ? `${kind} (from ${prov.derivationSource})` : kind;
    })
        .join(', ');
    return `${exports.STORYBOARD_MODE_LABELS[activeMode]} mode shows: ${labels}`;
}
function deriveStoryboardEdges(input) {
    const allowedKinds = new Set(exports.STORYBOARD_MODE_RELATION_KINDS[input.activeMode]);
    const seen = new Set();
    const result = [];
    for (const edge of input.entityGraphEdges) {
        if (!allowedKinds.has(edge.relationKind))
            continue;
        const sourceId = graphNodeId(edge, 'source');
        const targetId = graphNodeId(edge, 'target');
        if (!input.visibleNodeIds.has(sourceId) || !input.visibleNodeIds.has(targetId))
            continue;
        const dedupeKey = `${edge.relationKind}:${sourceId}:${targetId}`;
        if (seen.has(dedupeKey))
            continue;
        seen.add(dedupeKey);
        const provenance = exports.STORYBOARD_EDGE_PROVENANCE[edge.relationKind];
        if (!provenance)
            continue;
        const sourceTitle = input.entityTitles.get(sourceId) ?? sourceId;
        const targetTitle = input.entityTitles.get(targetId) ?? targetId;
        result.push({
            sourceId,
            targetId,
            relationKind: edge.relationKind,
            derivationSource: provenance.derivationSource,
            derivationDomain: provenance.derivationDomain,
            explanation: formatExplanation(provenance.explanationTemplate, sourceTitle, targetTitle),
            activeMode: input.activeMode,
            editable: provenance.editable,
            editField: provenance.editField,
            edgeKind: edgeVisualKind(edge.relationKind),
        });
    }
    return result;
}
function assertStoryboardEdgeProvenance(edges) {
    for (const edge of edges) {
        if (!edge.relationKind)
            throw new Error('edge missing relationKind');
        if (!edge.derivationSource)
            throw new Error('edge missing derivationSource');
        if (!edge.explanation)
            throw new Error('edge missing explanation');
    }
}
//# sourceMappingURL=storyboardEdgeDerivation.js.map