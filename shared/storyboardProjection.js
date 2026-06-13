"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORYBOARD_SESSION_PRESETS = exports.STORYBOARD_PRESETS = exports.ADVENTURE_SECTIONS = exports.STORYBOARD_VIEW_VERSION = exports.deriveStoryboardEdges = exports.buildModeLegend = exports.STORYBOARD_MODE_LABELS = exports.STORYBOARD_MODE_RELATION_KINDS = exports.STORYBOARD_EDGE_PROVENANCE = void 0;
exports.emptyStoryboardView = emptyStoryboardView;
exports.parseStoryboardView = parseStoryboardView;
exports.pruneStaleLayoutNodes = pruneStaleLayoutNodes;
exports.sanitizeLayoutForSave = sanitizeLayoutForSave;
exports.buildStoryboardProjection = buildStoryboardProjection;
exports.normalizeAdventureSection = normalizeAdventureSection;
const narrativeBeatTypes_js_1 = require("./narrativeBeatTypes.js");
const storyboardEdgeDerivation_js_1 = require("./storyboardEdgeDerivation.js");
var storyboardEdgeDerivation_js_2 = require("./storyboardEdgeDerivation.js");
Object.defineProperty(exports, "STORYBOARD_EDGE_PROVENANCE", { enumerable: true, get: function () { return storyboardEdgeDerivation_js_2.STORYBOARD_EDGE_PROVENANCE; } });
Object.defineProperty(exports, "STORYBOARD_MODE_RELATION_KINDS", { enumerable: true, get: function () { return storyboardEdgeDerivation_js_2.STORYBOARD_MODE_RELATION_KINDS; } });
Object.defineProperty(exports, "STORYBOARD_MODE_LABELS", { enumerable: true, get: function () { return storyboardEdgeDerivation_js_2.STORYBOARD_MODE_LABELS; } });
Object.defineProperty(exports, "buildModeLegend", { enumerable: true, get: function () { return storyboardEdgeDerivation_js_2.buildModeLegend; } });
Object.defineProperty(exports, "deriveStoryboardEdges", { enumerable: true, get: function () { return storyboardEdgeDerivation_js_2.deriveStoryboardEdges; } });
exports.STORYBOARD_VIEW_VERSION = 'storyboard-view-v1';
exports.ADVENTURE_SECTIONS = [
    'board',
    'scenes',
    'investigation',
    'continuity',
    'arcs',
    'sessions',
    'scene-timeline',
    'thread-history',
    'timeline',
];
function emptyStoryboardView() {
    return {
        version: exports.STORYBOARD_VIEW_VERSION,
        nodes: [],
        edges: [],
        lanes: [],
        annotations: [],
        visibility: {},
        activeMode: 'arc_flow',
    };
}
function parseStoryboardView(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return emptyStoryboardView();
    }
    const obj = raw;
    if (obj.version !== exports.STORYBOARD_VIEW_VERSION) {
        return emptyStoryboardView();
    }
    const nodes = [];
    if (Array.isArray(obj.nodes)) {
        for (const entry of obj.nodes) {
            if (!entry || typeof entry !== 'object')
                continue;
            const n = entry;
            if (typeof n.entityId !== 'string' || typeof n.entityType !== 'string')
                continue;
            if (typeof n.x !== 'number' || typeof n.y !== 'number')
                continue;
            nodes.push({
                entityType: n.entityType,
                entityId: n.entityId,
                x: n.x,
                y: n.y,
                laneId: typeof n.laneId === 'string' ? n.laneId : undefined,
                collapsed: n.collapsed === true,
            });
        }
    }
    const edges = [];
    if (Array.isArray(obj.edges)) {
        for (const entry of obj.edges) {
            if (!entry || typeof entry !== 'object')
                continue;
            const e = entry;
            if (typeof e.sourceId !== 'string' || typeof e.targetId !== 'string')
                continue;
            const edgeKind = e.edgeKind === 'optional' || e.edgeKind === 'branch' ? e.edgeKind : 'required';
            edges.push({
                sourceId: e.sourceId,
                targetId: e.targetId,
                edgeKind,
                label: typeof e.label === 'string' ? e.label : undefined,
            });
        }
    }
    const lanes = [];
    if (Array.isArray(obj.lanes)) {
        for (const entry of obj.lanes) {
            if (!entry || typeof entry !== 'object')
                continue;
            const l = entry;
            if (typeof l.id !== 'string' || typeof l.label !== 'string')
                continue;
            lanes.push({
                id: l.id,
                label: l.label,
                actIndex: typeof l.actIndex === 'number' ? l.actIndex : undefined,
                collapsed: l.collapsed === true,
            });
        }
    }
    const annotations = [];
    if (Array.isArray(obj.annotations)) {
        for (const entry of obj.annotations) {
            if (!entry || typeof entry !== 'object')
                continue;
            const a = entry;
            if (typeof a.id !== 'string' || typeof a.text !== 'string')
                continue;
            if (typeof a.x !== 'number' || typeof a.y !== 'number')
                continue;
            annotations.push({
                id: a.id,
                x: a.x,
                y: a.y,
                text: a.text,
                linkedEntityIds: Array.isArray(a.linkedEntityIds)
                    ? a.linkedEntityIds.filter((id) => typeof id === 'string')
                    : undefined,
            });
        }
    }
    const visibility = {};
    if (obj.visibility && typeof obj.visibility === 'object' && !Array.isArray(obj.visibility)) {
        const v = obj.visibility;
        if (Array.isArray(v.collapseByArc)) {
            visibility.collapseByArc = v.collapseByArc.filter((id) => typeof id === 'string');
        }
        if (v.hideCompletedScenes === true)
            visibility.hideCompletedScenes = true;
        if (v.onlyReachable === true)
            visibility.onlyReachable = true;
        if (Array.isArray(v.factionPageIds)) {
            visibility.factionPageIds = v.factionPageIds.filter((id) => typeof id === 'string');
        }
        if (typeof v.sessionId === 'string')
            visibility.sessionId = v.sessionId;
        if (Array.isArray(v.playerRelevancePageIds)) {
            visibility.playerRelevancePageIds = v.playerRelevancePageIds.filter((id) => typeof id === 'string');
        }
        if (typeof v.isolateInvestigationPath === 'string') {
            visibility.isolateInvestigationPath = v.isolateInvestigationPath;
        }
        if (v.onlyPressureLinked === true)
            visibility.onlyPressureLinked = true;
        if (v.narrativeWeightMin === 'minor' ||
            v.narrativeWeightMin === 'major' ||
            v.narrativeWeightMin === 'critical') {
            visibility.narrativeWeightMin = v.narrativeWeightMin;
        }
        if (Array.isArray(v.beatTypes)) {
            const beatTypes = (0, narrativeBeatTypes_js_1.normalizeSceneBeatTypeFilter)(v.beatTypes);
            if (beatTypes.length > 0)
                visibility.beatTypes = beatTypes;
        }
    }
    const activeModeRaw = obj.activeMode;
    const activeMode = activeModeRaw === 'investigation' ||
        activeModeRaw === 'session_prep' ||
        activeModeRaw === 'continuity'
        ? activeModeRaw
        : 'arc_flow';
    return {
        version: exports.STORYBOARD_VIEW_VERSION,
        nodes,
        edges,
        lanes,
        annotations,
        visibility,
        activeMode,
    };
}
function pruneStaleLayoutNodes(layout, validEntityIds) {
    return {
        ...layout,
        nodes: layout.nodes.filter((node) => validEntityIds.has(node.entityId)),
    };
}
/** Strip deprecated semantic edges before persisting layout chrome. */
function sanitizeLayoutForSave(layout) {
    return {
        ...layout,
        edges: [],
    };
}
function buildStoryboardProjection(input) {
    const { layout, entities, entityGraphEdges = [], continuityIssues = [], pressureLinkedIds, ancestryByEntityId = {}, } = input;
    const issuesByEntity = new Map();
    for (const issue of continuityIssues) {
        const ids = [
            ...(issue.pageId ? [issue.pageId] : []),
            ...(issue.relatedPageId ? [issue.relatedPageId] : []),
            ...(issue.relatedPageIds ?? []),
        ];
        for (const id of ids) {
            issuesByEntity.set(id, (issuesByEntity.get(id) ?? 0) + 1);
        }
    }
    const filters = layout.visibility;
    let nodes = layout.nodes.map((node) => {
        const entity = entities.get(node.entityId);
        const missing = !entity;
        return {
            ...node,
            title: entity?.title ?? 'Missing entity',
            beatType: entity?.beatType ?? null,
            narrativeWeight: entity?.narrativeWeight,
            sceneStatus: entity?.sceneStatus,
            questStatus: entity?.questStatus ?? null,
            threadKind: entity?.threadKind ?? null,
            codexType: entity?.codexType ?? null,
            missing,
            continuityRiskCount: issuesByEntity.get(node.entityId) ?? 0,
        };
    });
    if (filters.hideCompletedScenes) {
        nodes = nodes.filter((n) => n.sceneStatus !== 'PLAYED');
    }
    if (filters.onlyPressureLinked && pressureLinkedIds) {
        nodes = nodes.filter((n) => pressureLinkedIds.has(n.entityId));
    }
    if (filters.narrativeWeightMin) {
        const minRank = weightRank(filters.narrativeWeightMin);
        nodes = nodes.filter((n) => weightRank(n.narrativeWeight) >= minRank);
    }
    if (filters.beatTypes && filters.beatTypes.length > 0) {
        const allowed = new Set(filters.beatTypes);
        nodes = nodes.filter((n) => {
            if (!n.beatType)
                return false;
            return allowed.has(n.beatType);
        });
    }
    if (filters.collapseByArc && filters.collapseByArc.length > 0) {
        const allowedArcs = new Set(filters.collapseByArc);
        nodes = nodes.filter((n) => {
            const chain = ancestryByEntityId[n.entityId];
            if (!chain || chain.length === 0)
                return true;
            return chain.some((arcId) => allowedArcs.has(arcId));
        });
    }
    const collapsedLaneIds = new Set(layout.lanes.filter((lane) => lane.collapsed).map((lane) => lane.id));
    if (collapsedLaneIds.size > 0) {
        nodes = nodes.filter((n) => !n.laneId || !collapsedLaneIds.has(n.laneId));
    }
    const visibleIds = new Set(nodes.map((n) => n.entityId));
    const entityTitles = new Map();
    for (const node of nodes) {
        entityTitles.set(node.entityId, node.title);
    }
    const activeMode = layout.activeMode;
    const edges = (0, storyboardEdgeDerivation_js_1.deriveStoryboardEdges)({
        activeMode,
        visibleNodeIds: visibleIds,
        entityGraphEdges,
        entityTitles,
    });
    return {
        layout,
        nodes,
        edges,
        modeLegend: (0, storyboardEdgeDerivation_js_1.buildModeLegend)(activeMode),
        continuityIssues,
    };
}
function weightRank(weight) {
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
function normalizeAdventureSection(raw) {
    if (typeof raw === 'string') {
        const lower = raw.trim().toLowerCase();
        if (lower === 'story') {
            return 'board';
        }
        if (exports.ADVENTURE_SECTIONS.includes(lower)) {
            return lower;
        }
    }
    return 'board';
}
/** Non-destructive storyboard scaffolds — layout chrome only. */
exports.STORYBOARD_PRESETS = [
    {
        id: 'three-act-campaign',
        label: 'Three-act campaign',
        description: 'Act I setup, Act II confrontation, Act III resolution',
        activeMode: 'arc_flow',
        lanes: [
            { id: 'act-1', label: 'Act I — Setup', actIndex: 0 },
            { id: 'act-2', label: 'Act II — Confrontation', actIndex: 1 },
            { id: 'act-3', label: 'Act III — Resolution', actIndex: 2 },
        ],
    },
    {
        id: 'mystery-investigation',
        label: 'Mystery investigation',
        description: 'Discovery, analysis, and confrontation lanes',
        activeMode: 'investigation',
        lanes: [
            { id: 'discovery', label: 'Discovery', actIndex: 0 },
            { id: 'analysis', label: 'Analysis', actIndex: 1 },
            { id: 'confrontation', label: 'Confrontation', actIndex: 2 },
        ],
    },
    {
        id: 'session-five-beat',
        label: 'Five-beat session',
        description: 'Hook → escalation → choice → fallout → button',
        activeMode: 'session_prep',
        lanes: [
            { id: 'hook', label: 'Hook', actIndex: 0 },
            { id: 'escalation', label: 'Escalation', actIndex: 1 },
            { id: 'choice', label: 'Choice', actIndex: 2 },
            { id: 'fallout', label: 'Fallout', actIndex: 3 },
            { id: 'button', label: 'Button', actIndex: 4 },
        ],
    },
];
/** @deprecated Use STORYBOARD_PRESETS */
exports.STORYBOARD_SESSION_PRESETS = exports.STORYBOARD_PRESETS;
//# sourceMappingURL=storyboardProjection.js.map