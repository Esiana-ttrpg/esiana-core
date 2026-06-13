"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInvestigationDependencyLedger = void 0;
exports.buildInvestigationTopology = buildInvestigationTopology;
var investigationDependencyLedger_js_1 = require("./investigationDependencyLedger.js");
Object.defineProperty(exports, "buildInvestigationDependencyLedger", { enumerable: true, get: function () { return investigationDependencyLedger_js_1.buildInvestigationDependencyLedger; } });
const investigationDependencyLedger_js_2 = require("./investigationDependencyLedger.js");
function buildInvestigationTopology(input) {
    const titlesById = new Map();
    for (const clue of input.clueThreads)
        titlesById.set(clue.id, clue.title);
    for (const scene of input.linkedScenes)
        titlesById.set(scene.id, scene.title);
    const scenes = input.linkedScenes.map((linked) => ({
        id: linked.id,
        title: linked.title,
        sceneKind: null,
        participantPageIds: [],
        locationPageId: null,
        linkedCluePageIds: [linked.clueId],
        linkedThreadPageIds: [],
        outcomes: [],
        reachable: !input.unreachableIds.has(linked.id),
    }));
    const threads = input.clueThreads.map((clue) => ({
        id: clue.id,
        title: clue.title,
        threadKind: 'clue',
        narrativeWeight: null,
        relatedPageIds: [],
        payoffPageId: null,
        reachable: clue.reachable,
        playerSubmitted: false,
    }));
    const result = (0, investigationDependencyLedger_js_2.buildInvestigationDependencyLedger)({
        threads,
        scenes,
        titlesById,
        spofClueIds: input.spofClueIds,
        unreachableIds: input.unreachableIds,
    });
    return { nodes: result.nodes, edges: result.edges };
}
//# sourceMappingURL=investigationTopology.js.map