/**
 * Global time hooks — Layer 1 temporal simulation spine (browser-safe contracts).
 */

export const TIME_HOOKS_SEMANTICS_VERSION = 'time-hooks-v1';

export const STUB_HANDLER_VERSION = 'stub-v1';

/** Max operational summary length stored in simulation receipts. */
export const MAX_HOOK_SUMMARY_LENGTH = 200;

export const GLOBAL_TIME_HOOK_IDS = [
  'cooldown_expiry',
  'project_progression',
  'haven_updates',
  'upkeep',
  'reputation_shifts',
  'event_generation',
] as const;

export type GlobalTimeHookId = (typeof GLOBAL_TIME_HOOK_IDS)[number];

export type GlobalTimeHookKind = 'canonical' | 'advisory';

export type GlobalTimeHookStatus =
  | 'skipped'
  | 'noop'
  | 'applied'
  | 'partial'
  | 'failed';

export type AdvanceMagnitude = 'tiny' | 'small' | 'medium' | 'large' | 'massive';

export type GlobalTimeAdvanceSource = 'time_tracking' | 'world_advance';

export type GlobalTimeHookCounts = {
  entitiesScanned?: number;
  entitiesUpdated?: number;
  eventsGenerated?: number;
  /** Upkeep / scheduled-effect hook diagnostics */
  schedulesScanned?: number;
  schedulesTriggered?: number;
  suggestionsGenerated?: number;
  cappedSchedules?: number;
  /** True when fire cap left due occurrences for a later advance */
  remaining?: boolean;
};

export type GlobalTimeHookDefinition = {
  id: GlobalTimeHookId;
  kind: GlobalTimeHookKind;
  plannedPhase: number;
};

/** Fixed handler order — do not reorder casually. `event_generation` is always last. */
export const GLOBAL_TIME_HOOK_DEFINITIONS: readonly GlobalTimeHookDefinition[] = [
  { id: 'cooldown_expiry', kind: 'canonical', plannedPhase: 8 },
  { id: 'project_progression', kind: 'canonical', plannedPhase: 2 },
  { id: 'haven_updates', kind: 'canonical', plannedPhase: 3 },
  { id: 'upkeep', kind: 'canonical', plannedPhase: 4 },
  { id: 'reputation_shifts', kind: 'canonical', plannedPhase: 5 },
  { id: 'event_generation', kind: 'advisory', plannedPhase: 6 },
] as const;

export const GLOBAL_TIME_HOOK_ORDER: readonly GlobalTimeHookId[] =
  GLOBAL_TIME_HOOK_DEFINITIONS.map((def) => def.id);

const MINUTES_PER_HOUR = 60n;
const MINUTES_PER_DAY = 1440n;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7n;
const MINUTES_PER_30_DAYS = MINUTES_PER_DAY * 30n;

export function computeAdvanceMagnitude(elapsedMinutes: bigint): AdvanceMagnitude {
  if (elapsedMinutes < MINUTES_PER_HOUR) return 'tiny';
  if (elapsedMinutes < MINUTES_PER_DAY) return 'small';
  if (elapsedMinutes < MINUTES_PER_WEEK) return 'medium';
  if (elapsedMinutes < MINUTES_PER_30_DAYS) return 'large';
  return 'massive';
}

export function truncateHookSummary(summary: string | undefined): string | undefined {
  if (!summary) return undefined;
  const trimmed = summary.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= MAX_HOOK_SUMMARY_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_HOOK_SUMMARY_LENGTH - 1)}…`;
}

export type GlobalTimeAdvanceContext = {
  campaignId: string;
  previousEpochMinute: string;
  nextEpochMinute: string;
  elapsedMinutes: string;
  advancedBy: { amount: string; unit: string };
  advanceMagnitude: AdvanceMagnitude;
  source: GlobalTimeAdvanceSource;
  actorUserId?: string;
  batchId?: string;
};

export type GlobalTimeHookResult = {
  hookId: GlobalTimeHookId;
  handlerVersion: string;
  status: GlobalTimeHookStatus;
  kind: GlobalTimeHookKind;
  durationMs: number;
  summary?: string;
  counts?: GlobalTimeHookCounts;
  error?: string;
};

export type GlobalTimeSimulationReceipt = {
  runId: string;
  semanticsVersion: string;
  context: GlobalTimeAdvanceContext;
  results: GlobalTimeHookResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export function emptyHookCounts(): GlobalTimeHookCounts {
  return {
    entitiesScanned: 0,
    entitiesUpdated: 0,
    eventsGenerated: 0,
  };
}

export function getHookDefinition(hookId: GlobalTimeHookId): GlobalTimeHookDefinition {
  const def = GLOBAL_TIME_HOOK_DEFINITIONS.find((entry) => entry.id === hookId);
  if (!def) {
    throw new Error(`Unknown global time hook: ${hookId}`);
  }
  return def;
}
