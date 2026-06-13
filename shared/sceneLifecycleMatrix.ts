/**
 * Scene lifecycle ↔ sceneStatus matrix (Layer 2 extension).
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import type { SceneStatus } from './sceneMetadata.js';
import { DEFAULT_SCENE_STATUS } from './sceneMetadata.js';

const ALLOWED_STATUS_BY_LIFECYCLE: Record<
  NarrativeLifecycleState,
  readonly SceneStatus[]
> = {
  [NarrativeLifecycleStates.LOCKED]: ['PLANNED'],
  [NarrativeLifecycleStates.DISCOVERED]: ['PLANNED', 'READY'],
  [NarrativeLifecycleStates.ACTIVE]: ['READY'],
  [NarrativeLifecycleStates.COMPLETED]: ['PLAYED'],
  [NarrativeLifecycleStates.FAILED]: ['SKIPPED'],
};

export function allowedSceneStatusesForLifecycle(
  lifecycle: NarrativeLifecycleState,
): readonly SceneStatus[] {
  return ALLOWED_STATUS_BY_LIFECYCLE[lifecycle] ?? ['PLANNED'];
}

export function coerceSceneStatusForLifecycle(
  status: SceneStatus,
  lifecycle: NarrativeLifecycleState,
): SceneStatus {
  const allowed = allowedSceneStatusesForLifecycle(lifecycle);
  if (allowed.includes(status)) return status;
  return allowed[0] ?? DEFAULT_SCENE_STATUS;
}

export function defaultSceneStatusForLifecycle(
  lifecycle: NarrativeLifecycleState,
): SceneStatus {
  const allowed = allowedSceneStatusesForLifecycle(lifecycle);
  return allowed[0] ?? DEFAULT_SCENE_STATUS;
}

export function lifecycleToSceneStatus(
  lifecycle: NarrativeLifecycleState,
  existingStatus?: SceneStatus,
): SceneStatus {
  switch (lifecycle) {
    case NarrativeLifecycleStates.LOCKED:
      return 'PLANNED';
    case NarrativeLifecycleStates.DISCOVERED:
      return existingStatus === 'READY' ? 'READY' : 'PLANNED';
    case NarrativeLifecycleStates.ACTIVE:
      return 'READY';
    case NarrativeLifecycleStates.COMPLETED:
      return 'PLAYED';
    case NarrativeLifecycleStates.FAILED:
      return 'SKIPPED';
    default:
      return DEFAULT_SCENE_STATUS;
  }
}

export function lifecycleTargetForSceneStatusPatch(
  status: SceneStatus,
  currentLifecycle: NarrativeLifecycleState,
): NarrativeLifecycleState | null {
  switch (status) {
    case 'PLANNED':
      if (currentLifecycle === NarrativeLifecycleStates.LOCKED) return null;
      return NarrativeLifecycleStates.DISCOVERED;
    case 'READY':
      return NarrativeLifecycleStates.ACTIVE;
    case 'PLAYED':
      return NarrativeLifecycleStates.COMPLETED;
    case 'SKIPPED':
      return NarrativeLifecycleStates.FAILED;
    default:
      return null;
  }
}
