import type { SceneMetadataFields } from '../../../shared/sceneMetadata.js';
import type { ThreadMetadataFields } from '../../../shared/threadMetadata.js';

/** Associated IDs must have been authorized, including any lifecycle and discovery rules. */
export function restrictSceneMetadata(scene: SceneMetadataFields, authorizedIds: ReadonlySet<string>, sessionIds: ReadonlySet<string> = new Set()): SceneMetadataFields {
  const allowed = (ids: string[]) => ids.filter(id => authorizedIds.has(id));
  return {
    ...scene,
    gmNotes: null,
    participantPageIds: allowed(scene.participantPageIds),
    locationPageId: scene.locationPageId && authorizedIds.has(scene.locationPageId) ? scene.locationPageId : null,
    linkedQuestPageIds: allowed(scene.linkedQuestPageIds),
    linkedObjectivePageIds: allowed(scene.linkedObjectivePageIds),
    linkedCluePageIds: allowed(scene.linkedCluePageIds),
    linkedThreadPageIds: allowed(scene.linkedThreadPageIds),
    consequencePageIds: allowed(scene.consequencePageIds),
    followsScenePageIds: allowed(scene.followsScenePageIds),
    // Conditions and outcomes are GM orchestration; session anchors must be independently authorized.
    entryConditions: [], exitConditions: [], outcomes: [],
    plannedSessionId: scene.plannedSessionId && sessionIds.has(scene.plannedSessionId) ? scene.plannedSessionId : null,
    playedSessionId: scene.playedSessionId && sessionIds.has(scene.playedSessionId) ? scene.playedSessionId : null,
  };
}

export function restrictThreadMetadata(thread: ThreadMetadataFields, authorizedIds: ReadonlySet<string>, sessionIds: ReadonlySet<string> = new Set()): ThreadMetadataFields {
  return {
    ...thread,
    relatedPageIds: thread.relatedPageIds.filter(id => authorizedIds.has(id)),
    payoffPageId: thread.payoffPageId && authorizedIds.has(thread.payoffPageId) ? thread.payoffPageId : null,
    introducedSessionId: thread.introducedSessionId && sessionIds.has(thread.introducedSessionId) ? thread.introducedSessionId : null,
    lastAdvancedSessionId: thread.lastAdvancedSessionId && sessionIds.has(thread.lastAdvancedSessionId) ? thread.lastAdvancedSessionId : null,
    resolvedSessionId: thread.resolvedSessionId && sessionIds.has(thread.resolvedSessionId) ? thread.resolvedSessionId : null,
  };
}
