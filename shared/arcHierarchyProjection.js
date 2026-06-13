"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildArcHierarchyProjection = buildArcHierarchyProjection;
exports.sceneArcAncestryIntersects = sceneArcAncestryIntersects;
exports.resolveArcKindFromMetadata = resolveArcKindFromMetadata;
/**
 * Layer 5 — phased arc hierarchy projection (O(n) per phase).
 * Campaign Arc → Questline → Quest → Objective tree + scene associations (many-to-many).
 */
const arcMetadata_js_1 = require("./arcMetadata.js");
const objectiveMetadata_js_1 = require("./objectiveMetadata.js");
const sceneMetadata_js_1 = require("./sceneMetadata.js");
function isQuestLikeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return (raw.questStatus !== undefined ||
        raw.questType !== undefined ||
        raw.boardOrder !== undefined);
}
function phase1NormalizeEntities(input) {
    const entitiesById = new Map();
    const sceneRowMetadata = new Map();
    const objectivesByQuestId = new Map();
    const scenesByObjectiveId = new Map();
    const scenesByQuestIdOnly = new Map();
    const scenesById = new Map();
    const sceneObjectiveCounts = new Map();
    for (const row of input.questRows) {
        const isArc = (0, arcMetadata_js_1.isArcMetadataPresent)(row.metadata);
        const isObjective = (0, objectiveMetadata_js_1.isObjectiveMetadataPresent)(row.metadata);
        const isQuest = !isArc && !isObjective && isQuestLikeMetadata(row.metadata);
        entitiesById.set(row.id, {
            id: row.id,
            title: row.title,
            parentId: row.parentId,
            metadata: row.metadata,
            isArc,
            arc: (0, arcMetadata_js_1.parseArcMetadata)(row.metadata),
            isQuest,
            isObjective,
        });
        if (isObjective && row.parentId) {
            const list = objectivesByQuestId.get(row.parentId) ?? [];
            list.push(row.id);
            objectivesByQuestId.set(row.parentId, list);
        }
    }
    for (const row of input.sceneRows) {
        if (!(0, sceneMetadata_js_1.isSceneMetadataPresent)(row.metadata))
            continue;
        const scene = (0, sceneMetadata_js_1.parseSceneMetadata)(row.metadata);
        scenesById.set(row.id, {
            id: row.id,
            title: row.title,
            sceneStatus: scene.sceneStatus,
            beatType: scene.beatType,
            narrativeWeight: scene.narrativeWeight,
            associatedObjectiveCount: 0,
        });
        sceneRowMetadata.set(row.id, row.metadata);
        const objectiveIds = scene.linkedObjectivePageIds;
        if (objectiveIds.length > 0) {
            for (const objectiveId of objectiveIds) {
                const list = scenesByObjectiveId.get(objectiveId) ?? [];
                list.push(row.id);
                scenesByObjectiveId.set(objectiveId, list);
                sceneObjectiveCounts.set(row.id, (sceneObjectiveCounts.get(row.id) ?? 0) + 1);
            }
        }
        else {
            for (const questId of scene.linkedQuestPageIds) {
                const list = scenesByQuestIdOnly.get(questId) ?? [];
                list.push(row.id);
                scenesByQuestIdOnly.set(questId, list);
            }
        }
    }
    for (const [sceneId, count] of sceneObjectiveCounts) {
        const slice = scenesById.get(sceneId);
        if (slice)
            slice.associatedObjectiveCount = count;
    }
    return {
        entitiesById,
        sceneRowMetadata,
        objectivesByQuestId,
        scenesByObjectiveId,
        scenesByQuestIdOnly,
        scenesById,
        questIdsInArcOverlay: new Set(),
        childToArcParents: new Map(),
    };
}
function phase2BuildArcOverlays(state) {
    for (const entity of state.entitiesById.values()) {
        if (!entity.isArc)
            continue;
        for (const childId of entity.arc.containedPageIds) {
            const parents = state.childToArcParents.get(childId) ?? [];
            parents.push(entity.id);
            state.childToArcParents.set(childId, parents);
            const child = state.entitiesById.get(childId);
            if (child?.isQuest) {
                state.questIdsInArcOverlay.add(childId);
            }
        }
    }
}
function makeSceneRefNodes(sceneIds) {
    const nodes = [];
    const seen = new Set();
    for (const sceneId of sceneIds) {
        if (seen.has(sceneId))
            continue;
        seen.add(sceneId);
        nodes.push({ kind: 'scene_ref', id: sceneId, title: '', children: [] });
    }
    return nodes;
}
function buildObjectiveNodes(questId, state) {
    const objectiveIds = state.objectivesByQuestId.get(questId) ?? [];
    return objectiveIds.map((objectiveId) => {
        const entity = state.entitiesById.get(objectiveId);
        const objective = (0, objectiveMetadata_js_1.parseObjectiveMetadata)(entity?.metadata);
        const sceneIds = state.scenesByObjectiveId.get(objectiveId) ?? [];
        return {
            kind: 'objective',
            id: objectiveId,
            title: entity?.title ?? 'Objective',
            objectiveStatus: objective.objectiveStatus,
            children: makeSceneRefNodes(sceneIds),
        };
    });
}
function buildQuestNode(questId, state) {
    const entity = state.entitiesById.get(questId);
    if (!entity)
        return null;
    const raw = entity.metadata;
    const questStatus = typeof raw.questStatus === 'string' ? raw.questStatus : undefined;
    const objectiveNodes = buildObjectiveNodes(questId, state);
    const questOnlyScenes = state.scenesByQuestIdOnly.get(questId) ?? [];
    return {
        kind: 'quest',
        id: questId,
        title: entity.title,
        questStatus,
        children: [...objectiveNodes, ...makeSceneRefNodes(questOnlyScenes)],
    };
}
function buildArcNode(arcId, state) {
    const entity = state.entitiesById.get(arcId);
    if (!entity?.isArc)
        return null;
    const children = [];
    for (const childId of entity.arc.containedPageIds) {
        const child = state.entitiesById.get(childId);
        if (!child)
            continue;
        if (child.isArc && child.arc.arcKind === 'questline') {
            const questlineNode = buildArcNode(childId, state);
            if (questlineNode)
                children.push(questlineNode);
        }
        else if (child.isQuest) {
            const questNode = buildQuestNode(childId, state);
            if (questNode)
                children.push(questNode);
        }
    }
    return {
        kind: entity.arc.arcKind === 'questline' ? 'questline' : 'campaign_arc',
        id: arcId,
        title: entity.title,
        arc: {
            arcKind: entity.arc.arcKind,
            actIndex: entity.arc.actIndex,
            pacingTarget: entity.arc.pacingTarget,
        },
        children,
    };
}
function phase3To4BuildTree(state) {
    const roots = [];
    for (const entity of state.entitiesById.values()) {
        if (!entity.isArc || entity.arc.arcKind !== 'campaign_arc')
            continue;
        const node = buildArcNode(entity.id, state);
        if (node)
            roots.push(node);
    }
    return roots;
}
function phase5ResolveOrphans(state) {
    const orphans = {
        quests: [],
        objectives: [],
        scenes: [],
    };
    for (const entity of state.entitiesById.values()) {
        if (entity.isQuest && !state.questIdsInArcOverlay.has(entity.id)) {
            orphans.quests.push({ id: entity.id, title: entity.title });
        }
        if (entity.isObjective) {
            const parent = entity.parentId ? state.entitiesById.get(entity.parentId) : null;
            if (!parent?.isQuest) {
                orphans.objectives.push({ id: entity.id, title: entity.title });
            }
        }
    }
    for (const [sceneId, slice] of state.scenesById) {
        let attached = false;
        for (const ids of state.scenesByObjectiveId.values()) {
            if (ids.includes(sceneId)) {
                attached = true;
                break;
            }
        }
        if (!attached) {
            for (const ids of state.scenesByQuestIdOnly.values()) {
                if (ids.includes(sceneId)) {
                    attached = true;
                    break;
                }
            }
        }
        if (!attached)
            orphans.scenes.push({ id: sceneId, title: slice.title });
    }
    return orphans;
}
function phase6ComputeAncestry(roots, state) {
    const ancestryByEntityId = {};
    const walk = (node, arcChain) => {
        const chain = node.kind === 'campaign_arc' || node.kind === 'questline'
            ? [...arcChain, node.id]
            : arcChain;
        if (node.kind === 'scene_ref') {
            ancestryByEntityId[node.id] = chain;
        }
        else {
            ancestryByEntityId[node.id] = chain;
        }
        for (const child of node.children)
            walk(child, chain);
    };
    for (const root of roots)
        walk(root, []);
    for (const questId of state.questIdsInArcOverlay) {
        if (!ancestryByEntityId[questId]) {
            const parents = state.childToArcParents.get(questId) ?? [];
            ancestryByEntityId[questId] = parents;
        }
    }
    return ancestryByEntityId;
}
function phase7EmitWarnings(state) {
    const warnings = [];
    for (const entity of state.entitiesById.values()) {
        if (!entity.isArc)
            continue;
        for (const childId of entity.arc.containedPageIds) {
            const child = state.entitiesById.get(childId);
            if (!child) {
                warnings.push({
                    kind: 'invalid_arc_containment',
                    message: 'Arc references a missing page',
                    entityIds: [entity.id, childId],
                });
                continue;
            }
            const childKind = (0, arcMetadata_js_1.classifyArcContainmentChild)(child.metadata, child.isQuest);
            if (!(0, arcMetadata_js_1.validateArcContainment)(entity.arc.arcKind, childKind)) {
                warnings.push({
                    kind: 'invalid_arc_containment',
                    message: `Invalid ${entity.arc.arcKind} containment`,
                    entityIds: [entity.id, childId],
                });
            }
        }
    }
    for (const entity of state.entitiesById.values()) {
        if (!entity.isObjective)
            continue;
        const parent = entity.parentId ? state.entitiesById.get(entity.parentId) : null;
        if (!parent?.isQuest) {
            warnings.push({
                kind: 'objective_parent_not_quest',
                message: 'Objective wiki parent is not a quest page',
                entityIds: [entity.id],
            });
        }
    }
    for (const [sceneId, slice] of state.scenesById) {
        const meta = state.sceneRowMetadata.get(sceneId);
        const scene = (0, sceneMetadata_js_1.parseSceneMetadata)(meta);
        for (const objectiveId of scene.linkedObjectivePageIds) {
            if (!state.entitiesById.has(objectiveId)) {
                warnings.push({
                    kind: 'dangling_objective_association',
                    message: 'Scene references a missing objective',
                    entityIds: [sceneId, objectiveId],
                });
            }
        }
        if (slice.associatedObjectiveCount === 0) {
            for (const questId of scene.linkedQuestPageIds) {
                if (!state.entitiesById.has(questId)) {
                    warnings.push({
                        kind: 'dangling_scene_association',
                        message: 'Scene references a missing quest',
                        entityIds: [sceneId, questId],
                    });
                }
            }
        }
    }
    return warnings;
}
function buildArcHierarchyProjection(input) {
    const state = phase1NormalizeEntities(input);
    phase2BuildArcOverlays(state);
    const roots = phase3To4BuildTree(state);
    const orphans = phase5ResolveOrphans(state);
    const ancestryByEntityId = phase6ComputeAncestry(roots, state);
    const warnings = phase7EmitWarnings(state);
    const scenesById = {};
    const sceneObjectiveCounts = {};
    for (const [id, slice] of state.scenesById) {
        scenesById[id] = slice;
        sceneObjectiveCounts[id] = slice.associatedObjectiveCount;
    }
    return {
        roots,
        scenesById,
        orphans,
        ancestryByEntityId,
        warnings,
        sceneObjectiveCounts,
    };
}
/** O(1) arc ancestry check for storyboard collapseByArc filter. */
function sceneArcAncestryIntersects(sceneId, allowedArcIds, ancestryByEntityId, scenesByObjectiveId, sceneRows) {
    if (allowedArcIds.size === 0)
        return true;
    const scene = sceneRows.find((r) => r.id === sceneId);
    if (!scene)
        return true;
    const meta = (0, sceneMetadata_js_1.parseSceneMetadata)(scene.metadata);
    for (const objectiveId of meta.linkedObjectivePageIds) {
        const chain = ancestryByEntityId[objectiveId];
        if (chain?.some((arcId) => allowedArcIds.has(arcId)))
            return true;
    }
    for (const questId of meta.linkedQuestPageIds) {
        const chain = ancestryByEntityId[questId];
        if (chain?.some((arcId) => allowedArcIds.has(arcId)))
            return true;
    }
    return false;
}
function resolveArcKindFromMetadata(metadata) {
    if (!(0, arcMetadata_js_1.isArcMetadataPresent)(metadata))
        return null;
    return (0, arcMetadata_js_1.parseArcMetadata)(metadata).arcKind;
}
//# sourceMappingURL=arcHierarchyProjection.js.map