export {
  SCENE_METADATA_VERSION,
  SCENE_STATUSES,
  SCENE_BEAT_TYPES,
  SCENE_KINDS,
  SCENE_OUTCOMES,
  DEFAULT_SCENE_STATUS,
  emptySceneMetadata,
  isSceneMetadataPresent,
  lifecycleToSceneStatus,
  lifecycleTargetForSceneStatusPatch,
  parseSceneMetadata,
  parseSceneMetadataWithWarnings,
  publishedSceneStatusToLifecycleHint,
  type ParseSceneMetadataResult,
  type SceneBeatType,
  type SceneKind,
  type SceneMetadataFields,
  type SceneNarrativeWeight,
  type SceneOutcome,
  type SceneOutcomeEntry,
  type SceneStatus,
} from '../../../shared/sceneMetadata.js';

import {
  parseSceneMetadata,
  type SceneMetadataFields,
} from '../../../shared/sceneMetadata.js';

const SCENE_METADATA_KEYS = [
  'sceneMetadataVersion',
  'sceneStatus',
  'narrativeWeight',
  'beatType',
  'tone',
  'pacingTags',
  'sceneKind',
  'summary',
  'entryConditions',
  'exitConditions',
  'outcomes',
  'participantPageIds',
  'locationPageId',
  'linkedQuestPageIds',
  'linkedObjectivePageIds',
  'linkedCluePageIds',
  'linkedThreadPageIds',
  'consequencePageIds',
  'followsScenePageIds',
  'plannedSessionId',
  'playedSessionId',
  'gmNotes',
  'sortOrder',
] as const;

export function mergeSceneMetadata(
  existing: unknown,
  patch: Partial<SceneMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseSceneMetadata(base);
  const merged: SceneMetadataFields = { ...parsed, ...patch };

  return {
    ...base,
    sceneMetadataVersion: merged.sceneMetadataVersion,
    sceneStatus: merged.sceneStatus,
    narrativeWeight: merged.narrativeWeight,
    beatType: merged.beatType,
    tone: merged.tone,
    pacingTags: merged.pacingTags,
    sceneKind: merged.sceneKind,
    summary: merged.summary,
    entryConditions: merged.entryConditions,
    exitConditions: merged.exitConditions,
    outcomes: merged.outcomes,
    participantPageIds: merged.participantPageIds,
    locationPageId: merged.locationPageId,
    linkedQuestPageIds: merged.linkedQuestPageIds,
    linkedObjectivePageIds: merged.linkedObjectivePageIds,
    linkedCluePageIds: merged.linkedCluePageIds,
    linkedThreadPageIds: merged.linkedThreadPageIds,
    consequencePageIds: merged.consequencePageIds,
    followsScenePageIds: merged.followsScenePageIds,
    plannedSessionId: merged.plannedSessionId,
    playedSessionId: merged.playedSessionId,
    gmNotes: merged.gmNotes,
    sortOrder: merged.sortOrder,
  };
}

export function sanitizeSceneMetadataForRole(
  parsed: SceneMetadataFields,
  canManage: boolean,
): SceneMetadataFields {
  if (canManage) return parsed;
  return { ...parsed, gmNotes: null };
}

export function hasSceneMetadataPatch(body: Record<string, unknown>): boolean {
  return SCENE_METADATA_KEYS.some((key) => key in body);
}

export function resolveSceneMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasSceneMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasSceneMetadataPatch(body)) {
    return body;
  }
  return null;
}
