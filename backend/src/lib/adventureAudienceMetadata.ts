import type { SceneMetadataFields } from '../../../shared/sceneMetadata.js';
import type { ThreadMetadataFields } from '../../../shared/threadMetadata.js';

/** Associated IDs must have been authorized, including any lifecycle and discovery rules. */
export function restrictSceneMetadata(scene: SceneMetadataFields, authorizedIds: ReadonlySet<string>): SceneMetadataFields {
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
    // Conditions, outcomes and session anchors lack their own audience projection.
    entryConditions: [], exitConditions: [], outcomes: [], plannedSessionId: null, playedSessionId: null,
  };
}

export function restrictThreadMetadata(thread: ThreadMetadataFields, authorizedIds: ReadonlySet<string>): ThreadMetadataFields {
  return {
    ...thread,
    relatedPageIds: thread.relatedPageIds.filter(id => authorizedIds.has(id)),
    payoffPageId: thread.payoffPageId && authorizedIds.has(thread.payoffPageId) ? thread.payoffPageId : null,
    introducedSessionId: null, lastAdvancedSessionId: null, resolvedSessionId: null,
  };
}
