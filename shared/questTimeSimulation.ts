/**
 * Layer 2 — quest time simulation (deadlines, offscreen progress, ignored escalation).
 * @see docs/architecture-internal/quest-time-simulation.md
 */
import type { ConsequenceEffect } from './narrativeConsequence.js';
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';

export const QUEST_TIME_SIMULATION_VERSION = 'quest-time-simulation-v1';

export const QUEST_TIME_METADATA_KEY = 'questTime';

export const OFFSCREEN_POSTURES = ['PASSIVE', 'STEADY', 'AGGRESSIVE'] as const;

export type OffscreenPosture = (typeof OFFSCREEN_POSTURES)[number];

export const DEFAULT_OFFSCREEN_POSTURE: OffscreenPosture = 'PASSIVE';

export const QUEST_TIMELINE_TOUCH_REASONS = [
  'SCENE_LINK',
  'QUEST_STATUS_CHANGE',
  'OBJECTIVE_PROGRESS',
  'LIFECYCLE_TRANSITION',
  'MANUAL',
] as const;

export type QuestTimelineTouchReason = (typeof QUEST_TIMELINE_TOUCH_REASONS)[number];

export type QuestTimeEscalationTier = {
  id: string;
  afterDays: number;
  title: string;
  summary: string;
  effects?: ConsequenceEffect[];
  autoFail?: boolean;
};

export type QuestTimeRules = {
  expiresAtEpochMinute?: string | null;
  autoFailOnExpiry?: boolean;
  offscreenProgress?: {
    totalMinutes: number;
    posture?: OffscreenPosture;
  } | null;
  ignoredEscalation?: {
    tiers: QuestTimeEscalationTier[];
  } | null;
  isTimePressurePaused?: boolean;
  pausedReason?: string | null;
};

export type QuestTimeState = {
  partyTouchEpochMinute?: string | null;
  elapsedOffscreenMinutes?: number;
  currentEscalationTierId?: string | null;
  lastSimulatedAtEpochMinute?: string | null;
  offscreenComplete?: boolean;
  appliedSignalReceipts?: string[];
};

export type QuestTimePayload = {
  version: typeof QUEST_TIME_SIMULATION_VERSION;
  rules: QuestTimeRules;
  state: QuestTimeState;
};

export type QuestTimeSignal =
  | {
      kind: 'QUEST_EXPIRED';
      questPageId: string;
      expiresAtEpochMinute: string;
      autoFailOnExpiry: boolean;
    }
  | {
      kind: 'QUEST_ESCALATION_TIER_REACHED';
      questPageId: string;
      tierId: string;
      tier: QuestTimeEscalationTier;
    }
  | {
      kind: 'QUEST_OFFSCREEN_PROGRESS_COMPLETE';
      questPageId: string;
      totalMinutes: number;
    };

export type QuestTimePressureBadge = 'expiring' | 'offscreen' | 'escalating' | 'paused';

export type QuestTimeFeedItem = {
  id: string;
  questPageId: string;
  questTitle: string;
  title: string;
  summary: string;
  tone: 'neutral' | 'warning' | 'escalation';
  priority: 'actionable' | 'ambient';
  signalKind: QuestTimeSignal['kind'];
  tierId?: string;
  expiresAtEpochMinute?: string;
};

const MINUTES_PER_DAY = 1440n;
const AGGRESSIVE_INACTIVITY_MULTIPLIER = 2;

const LIVING_LIFECYCLE = new Set<NarrativeLifecycleState>([
  NarrativeLifecycleStates.DISCOVERED,
  NarrativeLifecycleStates.ACTIVE,
]);

export function buildQuestExpiryDismissKey(
  questPageId: string,
  expiresAtEpochMinute: string,
): string {
  return `quest-expiry-dismissed:${questPageId}:${expiresAtEpochMinute}`;
}

export function buildQuestTimeTierReceiptKey(
  questPageId: string,
  tierId: string,
  batchId: string,
): string {
  return `quest-time:${questPageId}:tier:${tierId}:${batchId}`;
}

export function generateEscalationTierId(): string {
  return `tier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEpochMinuteString(raw: unknown): string | null {
  if (typeof raw === 'bigint') return raw.toString();
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw).toString();
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return BigInt(raw.trim()).toString();
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeNonNegativeInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function normalizeOffscreenPosture(raw: unknown): OffscreenPosture {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((OFFSCREEN_POSTURES as readonly string[]).includes(upper)) {
      return upper as OffscreenPosture;
    }
  }
  return DEFAULT_OFFSCREEN_POSTURE;
}

function parseEscalationTier(raw: unknown): QuestTimeEscalationTier | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const afterDays = normalizeNonNegativeInt(obj.afterDays);
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  if (afterDays == null || !title || !summary) return null;
  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : generateEscalationTierId();
  const effects = Array.isArray(obj.effects)
    ? (obj.effects as ConsequenceEffect[])
    : undefined;
  return {
    id,
    afterDays,
    title,
    summary,
    effects,
    autoFail: obj.autoFail === true,
  };
}

function parseQuestTimeRules(raw: unknown): QuestTimeRules {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const rules: QuestTimeRules = {};

  if ('expiresAtEpochMinute' in obj) {
    rules.expiresAtEpochMinute =
      obj.expiresAtEpochMinute === null
        ? null
        : normalizeEpochMinuteString(obj.expiresAtEpochMinute);
  }
  if (typeof obj.autoFailOnExpiry === 'boolean') {
    rules.autoFailOnExpiry = obj.autoFailOnExpiry;
  }
  if ('offscreenProgress' in obj) {
    if (obj.offscreenProgress === null) {
      rules.offscreenProgress = null;
    } else if (obj.offscreenProgress && typeof obj.offscreenProgress === 'object') {
      const progress = obj.offscreenProgress as Record<string, unknown>;
      const totalMinutes = normalizeNonNegativeInt(progress.totalMinutes);
      if (totalMinutes != null && totalMinutes > 0) {
        rules.offscreenProgress = {
          totalMinutes,
          posture: normalizeOffscreenPosture(progress.posture),
        };
      }
    }
  }
  if ('ignoredEscalation' in obj) {
    if (obj.ignoredEscalation === null) {
      rules.ignoredEscalation = null;
    } else if (obj.ignoredEscalation && typeof obj.ignoredEscalation === 'object') {
      const esc = obj.ignoredEscalation as Record<string, unknown>;
      const tiers: QuestTimeEscalationTier[] = [];
      if (Array.isArray(esc.tiers)) {
        for (const entry of esc.tiers) {
          const tier = parseEscalationTier(entry);
          if (tier) tiers.push(tier);
        }
      }
      rules.ignoredEscalation = { tiers };
    }
  }
  if (typeof obj.isTimePressurePaused === 'boolean') {
    rules.isTimePressurePaused = obj.isTimePressurePaused;
  }
  if ('pausedReason' in obj) {
    rules.pausedReason =
      typeof obj.pausedReason === 'string' && obj.pausedReason.trim()
        ? obj.pausedReason.trim()
        : null;
  }
  return rules;
}

function parseQuestTimeState(raw: unknown): QuestTimeState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const state: QuestTimeState = {};

  if ('partyTouchEpochMinute' in obj) {
    state.partyTouchEpochMinute =
      obj.partyTouchEpochMinute === null
        ? null
        : normalizeEpochMinuteString(obj.partyTouchEpochMinute);
  }
  const elapsed = normalizeNonNegativeInt(obj.elapsedOffscreenMinutes);
  if (elapsed != null) state.elapsedOffscreenMinutes = elapsed;
  if (typeof obj.currentEscalationTierId === 'string') {
    state.currentEscalationTierId = obj.currentEscalationTierId.trim() || null;
  }
  if ('lastSimulatedAtEpochMinute' in obj) {
    state.lastSimulatedAtEpochMinute =
      obj.lastSimulatedAtEpochMinute === null
        ? null
        : normalizeEpochMinuteString(obj.lastSimulatedAtEpochMinute);
  }
  if (obj.offscreenComplete === true) state.offscreenComplete = true;
  if (Array.isArray(obj.appliedSignalReceipts)) {
    state.appliedSignalReceipts = obj.appliedSignalReceipts.filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    );
  }
  return state;
}

export function emptyQuestTimePayload(): QuestTimePayload {
  return {
    version: QUEST_TIME_SIMULATION_VERSION,
    rules: {},
    state: {},
  };
}

export function parseQuestTimePayload(metadata: unknown): QuestTimePayload | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[QUEST_TIME_METADATA_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== QUEST_TIME_SIMULATION_VERSION) return null;
  return {
    version: QUEST_TIME_SIMULATION_VERSION,
    rules: parseQuestTimeRules(obj.rules),
    state: parseQuestTimeState(obj.state),
  };
}

export function hasQuestTimeRules(rules: QuestTimeRules): boolean {
  return Boolean(
    rules.expiresAtEpochMinute ||
      rules.offscreenProgress ||
      (rules.ignoredEscalation?.tiers.length ?? 0) > 0,
  );
}

export function mergeQuestTimeRules(
  existing: QuestTimePayload | null,
  patch: Partial<QuestTimeRules>,
): QuestTimePayload {
  const base = existing ?? emptyQuestTimePayload();
  const mergedRules: QuestTimeRules = { ...base.rules, ...patch };
  if ('expiresAtEpochMinute' in patch) {
    mergedRules.expiresAtEpochMinute = patch.expiresAtEpochMinute ?? null;
  }
  if ('offscreenProgress' in patch) {
    mergedRules.offscreenProgress = patch.offscreenProgress ?? null;
  }
  if ('ignoredEscalation' in patch) {
    mergedRules.ignoredEscalation = patch.ignoredEscalation ?? null;
  }
  if ('pausedReason' in patch) {
    mergedRules.pausedReason = patch.pausedReason ?? null;
  }
  return {
    version: QUEST_TIME_SIMULATION_VERSION,
    rules: mergedRules,
    state: base.state,
  };
}

export function mergeQuestTimeState(
  existing: QuestTimePayload,
  patch: Partial<QuestTimeState>,
): QuestTimePayload {
  const mergedState: QuestTimeState = { ...existing.state, ...patch };
  if ('partyTouchEpochMinute' in patch) {
    mergedState.partyTouchEpochMinute = patch.partyTouchEpochMinute ?? null;
  }
  if ('currentEscalationTierId' in patch) {
    mergedState.currentEscalationTierId = patch.currentEscalationTierId ?? null;
  }
  if ('lastSimulatedAtEpochMinute' in patch) {
    mergedState.lastSimulatedAtEpochMinute = patch.lastSimulatedAtEpochMinute ?? null;
  }
  return {
    ...existing,
    state: mergedState,
  };
}

export function serializeQuestTimePayload(payload: QuestTimePayload): Record<string, unknown> {
  return {
    version: QUEST_TIME_SIMULATION_VERSION,
    rules: payload.rules,
    state: payload.state,
  };
}

export function stripQuestTimeStateForClone(payload: QuestTimePayload): QuestTimePayload {
  return {
    version: QUEST_TIME_SIMULATION_VERSION,
    rules: payload.rules,
    state: {},
  };
}

export function writeQuestTimeToMetadata(
  metadata: Record<string, unknown>,
  payload: QuestTimePayload,
): Record<string, unknown> {
  return {
    ...metadata,
    [QUEST_TIME_METADATA_KEY]: serializeQuestTimePayload(payload),
  };
}

export function daysSinceEpochMinute(
  fromEpochMinute: bigint,
  toEpochMinute: bigint,
): number {
  if (toEpochMinute <= fromEpochMinute) return 0;
  return Number((toEpochMinute - fromEpochMinute) / MINUTES_PER_DAY);
}

function isPartyAway(
  state: QuestTimeState,
  previousEpochMinute: bigint,
  touchedThisBatch: boolean,
): boolean {
  if (touchedThisBatch) return false;
  const touch = state.partyTouchEpochMinute
    ? BigInt(state.partyTouchEpochMinute)
    : null;
  if (touch == null) return true;
  return touch < previousEpochMinute;
}

function computeOffscreenDeltaMinutes(input: {
  posture: OffscreenPosture;
  elapsedMinutes: bigint;
  state: QuestTimeState;
  previousEpochMinute: bigint;
  touchedThisBatch: boolean;
}): bigint {
  const { posture, elapsedMinutes, state, previousEpochMinute, touchedThisBatch } = input;
  if (elapsedMinutes <= 0n) return 0n;

  if (posture === 'STEADY') return elapsedMinutes;

  const partyAway = isPartyAway(state, previousEpochMinute, touchedThisBatch);

  if (posture === 'PASSIVE') {
    return partyAway ? elapsedMinutes : 0n;
  }

  // AGGRESSIVE
  if (partyAway) return elapsedMinutes * BigInt(AGGRESSIVE_INACTIVITY_MULTIPLIER);
  return elapsedMinutes;
}

function tierAlreadyApplied(state: QuestTimeState, tierId: string): boolean {
  if (state.currentEscalationTierId === tierId) return true;
  return (state.appliedSignalReceipts ?? []).some((key) => key.includes(`:tier:${tierId}:`));
}

export type QuestTimeSimulationRow = {
  questPageId: string;
  questTitle: string;
  lifecycleState: NarrativeLifecycleState;
  questTime: QuestTimePayload;
  touchedThisBatch?: boolean;
};

export type DetectQuestTimeSignalsInput = {
  rows: QuestTimeSimulationRow[];
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
  elapsedMinutes: bigint;
  dismissedExpiryKeys: ReadonlySet<string>;
};

export type DetectQuestTimeSignalsResult = {
  signals: QuestTimeSignal[];
  nextStateByQuestId: Map<string, QuestTimeState>;
};

export function detectQuestTimeSignals(
  input: DetectQuestTimeSignalsInput,
): DetectQuestTimeSignalsResult {
  const signals: QuestTimeSignal[] = [];
  const nextStateByQuestId = new Map<string, QuestTimeState>();

  for (const row of input.rows) {
    if (!LIVING_LIFECYCLE.has(row.lifecycleState)) continue;
    if (row.questTime.rules.isTimePressurePaused) continue;
    if (!hasQuestTimeRules(row.questTime.rules)) continue;

    const state = { ...row.questTime.state };
    const rules = row.questTime.rules;
    const touchedThisBatch = row.touchedThisBatch ?? false;

    // Expiry
    if (rules.expiresAtEpochMinute) {
      const expiresAt = BigInt(rules.expiresAtEpochMinute);
      const crossed =
        expiresAt > input.previousEpochMinute && expiresAt <= input.nextEpochMinute;
      if (crossed) {
        const dismissKey = buildQuestExpiryDismissKey(row.questPageId, rules.expiresAtEpochMinute);
        const dismissed = input.dismissedExpiryKeys.has(dismissKey);
        if (!dismissed || rules.autoFailOnExpiry) {
          signals.push({
            kind: 'QUEST_EXPIRED',
            questPageId: row.questPageId,
            expiresAtEpochMinute: rules.expiresAtEpochMinute,
            autoFailOnExpiry: rules.autoFailOnExpiry === true,
          });
        }
      }
    }

    // Offscreen progress (ACTIVE only)
    if (
      row.lifecycleState === NarrativeLifecycleStates.ACTIVE &&
      rules.offscreenProgress &&
      !state.offscreenComplete
    ) {
      const total = rules.offscreenProgress.totalMinutes;
      const posture = rules.offscreenProgress.posture ?? DEFAULT_OFFSCREEN_POSTURE;
      const priorElapsed = state.elapsedOffscreenMinutes ?? 0;
      const delta = Number(
        computeOffscreenDeltaMinutes({
          posture,
          elapsedMinutes: input.elapsedMinutes,
          state,
          previousEpochMinute: input.previousEpochMinute,
          touchedThisBatch,
        }),
      );
      const nextElapsed = priorElapsed + delta;
      state.elapsedOffscreenMinutes = nextElapsed;
      if (priorElapsed < total && nextElapsed >= total) {
        state.offscreenComplete = true;
        signals.push({
          kind: 'QUEST_OFFSCREEN_PROGRESS_COMPLETE',
          questPageId: row.questPageId,
          totalMinutes: total,
        });
      }
    }

    // Ignored escalation (ACTIVE only)
    if (
      row.lifecycleState === NarrativeLifecycleStates.ACTIVE &&
      rules.ignoredEscalation?.tiers.length
    ) {
      const touchEpoch = state.partyTouchEpochMinute
        ? BigInt(state.partyTouchEpochMinute)
        : input.previousEpochMinute;
      const daysIgnored = daysSinceEpochMinute(touchEpoch, input.nextEpochMinute);
      const sortedTiers = [...rules.ignoredEscalation.tiers].sort(
        (a, b) => a.afterDays - b.afterDays,
      );
      for (const tier of sortedTiers) {
        if (daysIgnored < tier.afterDays) continue;
        if (tierAlreadyApplied(state, tier.id)) continue;
        signals.push({
          kind: 'QUEST_ESCALATION_TIER_REACHED',
          questPageId: row.questPageId,
          tierId: tier.id,
          tier,
        });
      }
    }

    state.lastSimulatedAtEpochMinute = input.nextEpochMinute.toString();
    nextStateByQuestId.set(row.questPageId, state);
  }

  return { signals, nextStateByQuestId };
}

export function computeQuestTimePressureBadges(input: {
  rules: QuestTimeRules;
  state: QuestTimeState;
  lifecycleState: NarrativeLifecycleState;
  currentEpochMinute: bigint;
}): QuestTimePressureBadge[] {
  const badges: QuestTimePressureBadge[] = [];
  if (!LIVING_LIFECYCLE.has(input.lifecycleState)) return badges;

  if (input.rules.isTimePressurePaused) {
    badges.push('paused');
    return badges;
  }

  if (input.rules.expiresAtEpochMinute) {
    const expiresAt = BigInt(input.rules.expiresAtEpochMinute);
    const remaining = expiresAt - input.currentEpochMinute;
    if (remaining <= 7n * MINUTES_PER_DAY) {
      badges.push('expiring');
    }
  }

  if (
    input.rules.offscreenProgress &&
    !input.state.offscreenComplete &&
    input.lifecycleState === NarrativeLifecycleStates.ACTIVE
  ) {
    badges.push('offscreen');
  }

  if ((input.rules.ignoredEscalation?.tiers.length ?? 0) > 0) {
    const touchEpoch = input.state.partyTouchEpochMinute
      ? BigInt(input.state.partyTouchEpochMinute)
      : 0n;
    const daysIgnored = daysSinceEpochMinute(touchEpoch, input.currentEpochMinute);
    const nextTier = [...(input.rules.ignoredEscalation?.tiers ?? [])]
      .sort((a, b) => a.afterDays - b.afterDays)
      .find((tier) => daysIgnored >= tier.afterDays * 0.75 && !tierAlreadyApplied(input.state, tier.id));
    if (nextTier) badges.push('escalating');
  }

  return badges;
}

export function buildQuestTimeFeedItems(input: {
  signals: QuestTimeSignal[];
  rowsById: Map<string, Pick<QuestTimeSimulationRow, 'questTitle' | 'questTime'>>;
  dismissedExpiryKeys: ReadonlySet<string>;
}): QuestTimeFeedItem[] {
  const items: QuestTimeFeedItem[] = [];

  for (const signal of input.signals) {
    const row = input.rowsById.get(signal.questPageId);
    const title = row?.questTitle ?? 'Quest';

    if (signal.kind === 'QUEST_EXPIRED') {
      const dismissKey = buildQuestExpiryDismissKey(
        signal.questPageId,
        signal.expiresAtEpochMinute,
      );
      if (!signal.autoFailOnExpiry && input.dismissedExpiryKeys.has(dismissKey)) continue;
      items.push({
        id: `quest-expired:${signal.questPageId}:${signal.expiresAtEpochMinute}`,
        questPageId: signal.questPageId,
        questTitle: title,
        title: signal.autoFailOnExpiry ? `${title} — deadline passed` : `${title} — deadline looming`,
        summary: signal.autoFailOnExpiry
          ? 'The quest window closed while the party was elsewhere.'
          : 'A authored deadline has passed — resolve or extend.',
        tone: 'escalation',
        priority: signal.autoFailOnExpiry ? 'ambient' : 'actionable',
        signalKind: signal.kind,
        expiresAtEpochMinute: signal.expiresAtEpochMinute,
      });
    }

    if (signal.kind === 'QUEST_ESCALATION_TIER_REACHED') {
      items.push({
        id: `quest-tier:${signal.questPageId}:${signal.tierId}`,
        questPageId: signal.questPageId,
        questTitle: title,
        title: signal.tier.title,
        summary: signal.tier.summary,
        tone: signal.tier.autoFail ? 'escalation' : 'warning',
        priority: 'actionable',
        signalKind: signal.kind,
        tierId: signal.tierId,
      });
    }

    if (signal.kind === 'QUEST_OFFSCREEN_PROGRESS_COMPLETE') {
      items.push({
        id: `quest-offscreen:${signal.questPageId}:${signal.totalMinutes}`,
        questPageId: signal.questPageId,
        questTitle: title,
        title: `${title} — offscreen clock complete`,
        summary: 'Background progress reached its authored limit while the party was away.',
        tone: 'warning',
        priority: 'actionable',
        signalKind: signal.kind,
      });
    }
  }

  return items;
}
