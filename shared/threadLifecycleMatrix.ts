/**
 * Lifecycle-authoritative / status-descriptive rules for open narrative threads.
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import type { ThreadStatus } from './threadMetadata.js';
import { DEFAULT_THREAD_STATUS } from './threadMetadata.js';

const LIFECYCLE_ALLOWED_STATUS: Record<
  NarrativeLifecycleState,
  readonly ThreadStatus[]
> = {
  [NarrativeLifecycleStates.LOCKED]: [],
  [NarrativeLifecycleStates.DISCOVERED]: ['OPEN', 'DORMANT'],
  [NarrativeLifecycleStates.ACTIVE]: ['OPEN'],
  [NarrativeLifecycleStates.COMPLETED]: ['RESOLVED'],
  [NarrativeLifecycleStates.FAILED]: ['ABANDONED'],
};

const LIFECYCLE_DEFAULT_STATUS: Record<NarrativeLifecycleState, ThreadStatus> = {
  [NarrativeLifecycleStates.LOCKED]: 'OPEN',
  [NarrativeLifecycleStates.DISCOVERED]: 'OPEN',
  [NarrativeLifecycleStates.ACTIVE]: 'OPEN',
  [NarrativeLifecycleStates.COMPLETED]: 'RESOLVED',
  [NarrativeLifecycleStates.FAILED]: 'ABANDONED',
};

export function allowedThreadStatusesForLifecycle(
  lifecycle: NarrativeLifecycleState,
): readonly ThreadStatus[] {
  return LIFECYCLE_ALLOWED_STATUS[lifecycle] ?? [];
}

export function defaultThreadStatusForLifecycle(
  lifecycle: NarrativeLifecycleState,
): ThreadStatus {
  return LIFECYCLE_DEFAULT_STATUS[lifecycle] ?? DEFAULT_THREAD_STATUS;
}

export function isThreadStatusAllowedForLifecycle(
  status: ThreadStatus,
  lifecycle: NarrativeLifecycleState,
): boolean {
  return allowedThreadStatusesForLifecycle(lifecycle).includes(status);
}

/** Coerce status to the nearest allowed value for lifecycle (prefer default). */
export function coerceThreadStatusForLifecycle(
  status: ThreadStatus,
  lifecycle: NarrativeLifecycleState,
): ThreadStatus {
  if (isThreadStatusAllowedForLifecycle(status, lifecycle)) {
    return status;
  }
  return defaultThreadStatusForLifecycle(lifecycle);
}

/**
 * Status PATCH may request a lifecycle transition only for terminal mappings.
 * Returns null when status change stays within current lifecycle constraints.
 */
export function lifecycleTargetForThreadStatusPatch(
  targetStatus: ThreadStatus,
  currentLifecycle: NarrativeLifecycleState,
): NarrativeLifecycleState | null {
  if (!isThreadStatusAllowedForLifecycle(targetStatus, currentLifecycle)) {
    switch (targetStatus) {
      case 'RESOLVED':
        return NarrativeLifecycleStates.COMPLETED;
      case 'ABANDONED':
        return NarrativeLifecycleStates.FAILED;
      case 'DORMANT':
        if (currentLifecycle === NarrativeLifecycleStates.ACTIVE) {
          return null;
        }
        if (currentLifecycle === NarrativeLifecycleStates.LOCKED) {
          return NarrativeLifecycleStates.DISCOVERED;
        }
        return null;
      case 'OPEN':
        if (currentLifecycle === NarrativeLifecycleStates.LOCKED) {
          return NarrativeLifecycleStates.DISCOVERED;
        }
        if (currentLifecycle === NarrativeLifecycleStates.DISCOVERED) {
          return NarrativeLifecycleStates.ACTIVE;
        }
        return null;
      default:
        return null;
    }
  }
  return null;
}

export function lifecycleToThreadStatus(
  state: NarrativeLifecycleState,
  existingStatus?: ThreadStatus,
): ThreadStatus {
  const allowed = allowedThreadStatusesForLifecycle(state);
  if (
    existingStatus &&
    allowed.includes(existingStatus)
  ) {
    return existingStatus;
  }
  return defaultThreadStatusForLifecycle(state);
}
