"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareSceneTimelineOrder = compareSceneTimelineOrder;
exports.isSceneIncomplete = isSceneIncomplete;
exports.deriveBlockingSceneIds = deriveBlockingSceneIds;
exports.topologicalSceneOrder = topologicalSceneOrder;
exports.resolveAnchorSessionId = resolveAnchorSessionId;
exports.deriveSessionConfidence = deriveSessionConfidence;
exports.buildSceneTimelineProjection = buildSceneTimelineProjection;
const INCOMPLETE_STATUSES = new Set(['PLANNED', 'READY']);
const HISTORICAL_STATUSES = new Set(['PLAYED', 'SKIPPED']);
function compareSceneTitles(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
function sceneSortKey(scene) {
    if (scene.scene.sortOrder != null && Number.isFinite(scene.scene.sortOrder)) {
        return scene.scene.sortOrder;
    }
    return Number.MAX_SAFE_INTEGER;
}
function compareSceneTimelineOrder(a, b) {
    const diff = sceneSortKey(a) - sceneSortKey(b);
    if (diff !== 0)
        return diff;
    return compareSceneTitles(a.title, b.title);
}
function isSceneIncomplete(status) {
    return INCOMPLETE_STATUSES.has(status);
}
function deriveBlockingSceneIds(scene, sceneById) {
    const blockingSceneIds = [];
    const blockingScenes = [];
    for (const predecessorId of scene.scene.followsScenePageIds) {
        const predecessor = sceneById.get(predecessorId);
        if (!predecessor)
            continue;
        if (!isSceneIncomplete(predecessor.scene.sceneStatus))
            continue;
        blockingSceneIds.push(predecessorId);
        blockingScenes.push({ id: predecessorId, title: predecessor.title });
    }
    blockingScenes.sort((a, b) => compareSceneTitles(a.title, b.title));
    return { blockingSceneIds, blockingScenes };
}
function topologicalSceneOrder(scenes) {
    if (scenes.length === 0)
        return [];
    const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
    const inDegree = new Map();
    const adjacency = new Map();
    for (const scene of scenes) {
        inDegree.set(scene.id, 0);
        adjacency.set(scene.id, []);
    }
    for (const scene of scenes) {
        for (const predecessorId of scene.scene.followsScenePageIds) {
            if (!sceneById.has(predecessorId))
                continue;
            adjacency.get(predecessorId).push(scene.id);
            inDegree.set(scene.id, (inDegree.get(scene.id) ?? 0) + 1);
        }
    }
    const queue = scenes
        .filter((scene) => (inDegree.get(scene.id) ?? 0) === 0)
        .sort(compareSceneTimelineOrder);
    const ordered = [];
    while (queue.length > 0) {
        const current = queue.shift();
        ordered.push(current);
        const successors = adjacency.get(current.id) ?? [];
        for (const successorId of successors) {
            const nextDegree = (inDegree.get(successorId) ?? 0) - 1;
            inDegree.set(successorId, nextDegree);
            if (nextDegree === 0) {
                const successor = sceneById.get(successorId);
                if (successor) {
                    queue.push(successor);
                    queue.sort(compareSceneTimelineOrder);
                }
            }
        }
    }
    if (ordered.length < scenes.length) {
        const remaining = scenes
            .filter((scene) => !ordered.some((entry) => entry.id === scene.id))
            .sort(compareSceneTimelineOrder);
        ordered.push(...remaining);
    }
    return ordered;
}
function sessionIndexById(sessions) {
    const sorted = [...sessions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    return new Map(sorted.map((session, index) => [session.id, index]));
}
function resolveAnchorSessionId(sessions, scenes) {
    if (sessions.length === 0)
        return null;
    const sorted = [...sessions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const sessionIndex = sessionIndexById(sessions);
    let lastPlayedIndex = -1;
    for (const scene of scenes) {
        const playedSessionId = scene.scene.playedSessionId;
        if (playedSessionId && sessionIndex.has(playedSessionId)) {
            lastPlayedIndex = Math.max(lastPlayedIndex, sessionIndex.get(playedSessionId));
        }
        if (scene.scene.sceneStatus === 'PLAYED' && scene.scene.plannedSessionId) {
            const idx = sessionIndex.get(scene.scene.plannedSessionId);
            if (idx != null)
                lastPlayedIndex = Math.max(lastPlayedIndex, idx);
        }
    }
    if (lastPlayedIndex >= 0 && lastPlayedIndex + 1 < sorted.length) {
        return sorted[lastPlayedIndex + 1].id;
    }
    return sorted[0].id;
}
function sessionById(sessions) {
    return new Map(sessions.map((session) => [session.id, session]));
}
function deriveSessionConfidence(input) {
    const { scene, plannedSessionId, sessions, anchorSessionId } = input;
    if (HISTORICAL_STATUSES.has(scene.scene.sceneStatus)) {
        return 'distant';
    }
    if (!plannedSessionId) {
        return 'distant';
    }
    const indexById = sessionIndexById(sessions);
    const targetIndex = indexById.get(plannedSessionId);
    if (targetIndex == null) {
        return 'tentative';
    }
    const anchorIndex = anchorSessionId != null && indexById.has(anchorSessionId)
        ? indexById.get(anchorSessionId)
        : 0;
    const distance = targetIndex - anchorIndex;
    const targetSession = sessionById(sessions).get(plannedSessionId);
    const hasPlannedDate = Boolean(targetSession?.plannedStartAt);
    if (distance >= 5) {
        return 'distant';
    }
    if (distance <= 1) {
        if (scene.scene.sceneStatus === 'READY' && hasPlannedDate) {
            return 'committed';
        }
        if (!hasPlannedDate) {
            return 'tentative';
        }
        if (scene.scene.sceneStatus === 'PLANNED') {
            return 'tentative';
        }
        return 'committed';
    }
    if (distance >= 2 && distance <= 4) {
        return 'tentative';
    }
    return 'distant';
}
function buildSceneTimelineEntry(scene, sceneById, sessions, anchorSessionId) {
    const { blockingSceneIds, blockingScenes } = deriveBlockingSceneIds(scene, sceneById);
    const plannedSessionId = scene.scene.plannedSessionId;
    return {
        id: scene.id,
        title: scene.title,
        sceneStatus: scene.scene.sceneStatus,
        beatType: scene.scene.beatType,
        plannedSessionId,
        playedSessionId: scene.scene.playedSessionId,
        sortOrder: scene.scene.sortOrder,
        linkedQuestPageIds: [...scene.scene.linkedQuestPageIds],
        blockingSceneIds,
        blockingScenes,
        sessionConfidence: deriveSessionConfidence({
            scene,
            plannedSessionId,
            sessions,
            anchorSessionId,
        }),
        isBlocked: blockingSceneIds.length > 0,
    };
}
function buildSceneTimelineProjection(input) {
    const sessions = [...input.sessions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const scenes = [...input.scenes];
    const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
    const anchorSessionId = resolveAnchorSessionId(sessions, scenes);
    const buildEntry = (scene) => buildSceneTimelineEntry(scene, sceneById, sessions, anchorSessionId);
    const columns = sessions.map((session) => ({
        sessionId: session.id,
        scenes: scenes
            .filter((scene) => scene.scene.plannedSessionId === session.id)
            .sort(compareSceneTimelineOrder)
            .map(buildEntry),
    }));
    const unscheduled = scenes
        .filter((scene) => !scene.scene.plannedSessionId)
        .sort(compareSceneTimelineOrder)
        .map(buildEntry);
    if (unscheduled.length > 0) {
        columns.push({ sessionId: null, scenes: unscheduled });
    }
    const sequenceList = topologicalSceneOrder(scenes).map(buildEntry);
    return {
        anchorSessionId,
        sessions,
        columns,
        sequenceList,
        arcFilterOptions: input.arcFilterOptions ?? [],
        questArcAncestry: input.questArcAncestry,
    };
}
//# sourceMappingURL=sceneTimelineProjection.js.map