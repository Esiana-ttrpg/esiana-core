/**
 * Layer 2 — narrative lifecycle orchestration (quests, future open threads).
 * @see docs/architecture-internal/narrative-lifecycle.md
 */
import type { NarrativePerspective } from './narrativeProjection.js';

export const NARRATIVE_LIFECYCLE_SEMANTICS_VERSION = 'narrative-lifecycle-v1';

export const NarrativeLifecycleStates = {
  LOCKED: 'LOCKED',
  DISCOVERED: 'DISCOVERED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type NarrativeLifecycleState =
  (typeof NarrativeLifecycleStates)[keyof typeof NarrativeLifecycleStates];

export const NarrativeLifecycleSubjectKinds = {
  QUEST: 'quest',
  OPEN_THREAD: 'open_thread',
  SCENE: 'scene',
} as const;

export type NarrativeLifecycleSubjectKind =
  (typeof NarrativeLifecycleSubjectKinds)[keyof typeof NarrativeLifecycleSubjectKinds];

/** Published Quest Hub metadata statuses (orchestration sync target). */
export type PublishedQuestStatus =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABANDONED';

export const DEFAULT_QUEST_LIFECYCLE_STATE: NarrativeLifecycleState =
  NarrativeLifecycleStates.LOCKED;

const LIFECYCLE_TRANSITIONS: Record<
  NarrativeLifecycleState,
  readonly NarrativeLifecycleState[]
> = {
  [NarrativeLifecycleStates.LOCKED]: [
    NarrativeLifecycleStates.DISCOVERED,
    NarrativeLifecycleStates.ACTIVE,
  ],
  [NarrativeLifecycleStates.DISCOVERED]: [
    NarrativeLifecycleStates.ACTIVE,
    NarrativeLifecycleStates.FAILED,
  ],
  [NarrativeLifecycleStates.ACTIVE]: [
    NarrativeLifecycleStates.COMPLETED,
    NarrativeLifecycleStates.FAILED,
  ],
  [NarrativeLifecycleStates.COMPLETED]: [],
  [NarrativeLifecycleStates.FAILED]: [],
};

export class NarrativeLifecycleTransitionError extends Error {
  readonly code = 'INVALID_LIFECYCLE_TRANSITION';
  readonly fromState: NarrativeLifecycleState;
  readonly toState: NarrativeLifecycleState;
  readonly allowedTargets: readonly NarrativeLifecycleState[];

  constructor(
    fromState: NarrativeLifecycleState,
    toState: NarrativeLifecycleState,
    allowedTargets: readonly NarrativeLifecycleState[],
  ) {
    super(
      `Invalid lifecycle transition from ${fromState} to ${toState}. Allowed: ${allowedTargets.join(', ') || '(none)'}`,
    );
    this.name = 'NarrativeLifecycleTransitionError';
    this.fromState = fromState;
    this.toState = toState;
    this.allowedTargets = allowedTargets;
  }
}

export function normalizeNarrativeLifecycleState(
  raw: unknown,
): NarrativeLifecycleState | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  const values = Object.values(NarrativeLifecycleStates) as string[];
  if (values.includes(upper)) {
    return upper as NarrativeLifecycleState;
  }
  return null;
}

export function allowedLifecycleTransitions(
  from: NarrativeLifecycleState,
): readonly NarrativeLifecycleState[] {
  return LIFECYCLE_TRANSITIONS[from] ?? [];
}

export function assertLifecycleTransition(
  from: NarrativeLifecycleState,
  to: NarrativeLifecycleState,
): void {
  const allowed = allowedLifecycleTransitions(from);
  if (!allowed.includes(to)) {
    throw new NarrativeLifecycleTransitionError(from, to, allowed);
  }
}

export interface NarrativeLifecycleProjection {
  canonical: NarrativeLifecycleState;
  /** State visible to the current viewer (null when hidden). */
  visible: NarrativeLifecycleState | null;
  /** Whether party-facing quest surfaces should include this subject. */
  partyVisible: boolean;
}

export function isLifecyclePartyVisible(
  state: NarrativeLifecycleState,
): boolean {
  return state !== NarrativeLifecycleStates.LOCKED;
}

export function projectNarrativeLifecycle(
  state: NarrativeLifecycleState,
  ctx: { perspective: NarrativePerspective },
): NarrativeLifecycleProjection {
  const partyVisible = isLifecyclePartyVisible(state);
  if (ctx.perspective === 'elevated') {
    return { canonical: state, visible: state, partyVisible };
  }
  if (!partyVisible) {
    return { canonical: state, visible: null, partyVisible: false };
  }
  return { canonical: state, visible: state, partyVisible: true };
}

export function lifecycleToPublishedQuestStatus(
  state: NarrativeLifecycleState,
  options?: { preserveAbandoned?: boolean },
): PublishedQuestStatus {
  switch (state) {
    case NarrativeLifecycleStates.LOCKED:
      return 'AVAILABLE';
    case NarrativeLifecycleStates.DISCOVERED:
      return 'AVAILABLE';
    case NarrativeLifecycleStates.ACTIVE:
      return 'ACTIVE';
    case NarrativeLifecycleStates.COMPLETED:
      return 'COMPLETED';
    case NarrativeLifecycleStates.FAILED:
      return options?.preserveAbandoned ? 'ABANDONED' : 'FAILED';
    default:
      return 'AVAILABLE';
  }
}

/** Backfill / hint mapping from legacy published questStatus. */
export function publishedQuestStatusToLifecycleHint(
  status: unknown,
): NarrativeLifecycleState {
  if (typeof status !== 'string') {
    return NarrativeLifecycleStates.DISCOVERED;
  }
  switch (status.trim().toUpperCase()) {
    case 'ACTIVE':
      return NarrativeLifecycleStates.ACTIVE;
    case 'COMPLETED':
      return NarrativeLifecycleStates.COMPLETED;
    case 'FAILED':
    case 'ABANDONED':
      return NarrativeLifecycleStates.FAILED;
    case 'AVAILABLE':
    default:
      return NarrativeLifecycleStates.DISCOVERED;
  }
}

/**
 * Map a target published questStatus (e.g. Kanban drag) to a lifecycle transition target.
 * Returns null when the published status does not imply a lifecycle change.
 */
export function publishedQuestStatusToLifecycleTarget(
  status: PublishedQuestStatus,
  currentLifecycle: NarrativeLifecycleState,
): NarrativeLifecycleState | null {
  switch (status) {
    case 'AVAILABLE':
      if (currentLifecycle === NarrativeLifecycleStates.LOCKED) {
        return NarrativeLifecycleStates.DISCOVERED;
      }
      if (currentLifecycle === NarrativeLifecycleStates.DISCOVERED) {
        return null;
      }
      return NarrativeLifecycleStates.DISCOVERED;
    case 'ACTIVE':
      return NarrativeLifecycleStates.ACTIVE;
    case 'COMPLETED':
      return NarrativeLifecycleStates.COMPLETED;
    case 'FAILED':
    case 'ABANDONED':
      return NarrativeLifecycleStates.FAILED;
    default:
      return null;
  }
}
