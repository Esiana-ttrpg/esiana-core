/**
 * Layer 1 — campaign scheduled effects (administration recurrence, not chronology).
 * @see docs/architecture-internal/scheduled-effects.md
 */

export const SCHEDULED_EFFECT_SEMANTICS_VERSION = 'scheduled-effect-v1';

export const SCHEDULED_EFFECT_STATUSES = ['active', 'paused', 'archived'] as const;

export type ScheduledEffectStatus = (typeof SCHEDULED_EFFECT_STATUSES)[number];

export const SCHEDULED_EFFECT_KINDS = [
  'ledger_upkeep',
  'ledger_income',
  'world_development_prompt',
  'haven_threat_prompt',
] as const;

export type ScheduledEffectKind = (typeof SCHEDULED_EFFECT_KINDS)[number];

export const TREASURY_SCHEDULED_EFFECT_KINDS = [
  'ledger_upkeep',
  'ledger_income',
] as const satisfies readonly ScheduledEffectKind[];

export const NARRATIVE_SCHEDULED_EFFECT_KINDS = [
  'world_development_prompt',
  'haven_threat_prompt',
] as const satisfies readonly ScheduledEffectKind[];

export type TreasuryScheduledEffectKind = (typeof TREASURY_SCHEDULED_EFFECT_KINDS)[number];
export type NarrativeScheduledEffectKind = (typeof NARRATIVE_SCHEDULED_EFFECT_KINDS)[number];

export const SCHEDULED_EFFECT_LIST_SCOPES = ['treasury', 'narrative', 'all'] as const;
export type ScheduledEffectListScope = (typeof SCHEDULED_EFFECT_LIST_SCOPES)[number];

export const SCHEDULED_EFFECT_OCCURRENCE_STATUSES = ['fired', 'suppressed'] as const;
export type ScheduledEffectOccurrenceStatus =
  (typeof SCHEDULED_EFFECT_OCCURRENCE_STATUSES)[number];

export const SCHEDULED_EFFECT_SUPPRESSION_REASONS = [
  'WORLD_DEVELOPMENT_DISABLED',
  'GENERATION_FAILED',
  'ORG_MISSING',
  'HAVEN_MISSING',
  'AUTHORING_INVALID',
  'PLUGIN_BLOCKED',
] as const;
export type ScheduledEffectSuppressionReason =
  (typeof SCHEDULED_EFFECT_SUPPRESSION_REASONS)[number];

export const SCHEDULED_EFFECT_KIND_LABELS: Record<ScheduledEffectKind, string> = {
  ledger_upkeep: 'Treasury upkeep',
  ledger_income: 'Treasury income',
  world_development_prompt: 'World development prompt',
  haven_threat_prompt: 'Haven threat prompt',
};

export const SCHEDULED_EFFECT_SUPPRESSION_REASON_LABELS: Record<
  ScheduledEffectSuppressionReason,
  string
> = {
  WORLD_DEVELOPMENT_DISABLED: 'World Development disabled',
  GENERATION_FAILED: 'Suggestion generation failed',
  ORG_MISSING: 'Organization missing',
  HAVEN_MISSING: 'Haven missing',
  AUTHORING_INVALID: 'Invalid schedule configuration',
  PLUGIN_BLOCKED: 'Blocked by plugin',
};

/** Max treasury suggestion fires per global time advance (mirrors project progression caps). */
export const MAX_SCHEDULED_EFFECT_FIRES_PER_ADVANCE = 24;

export type DurationRecurrence = {
  kind: 'duration';
  intervalMinutes: number;
};

export type CalendarMonthRecurrence = {
  kind: 'calendar_month';
  dayOfMonth: number;
  monthInterval?: number;
};

export type ScheduledEffectRecurrence = DurationRecurrence | CalendarMonthRecurrence;

export type ScheduledEffectCore = {
  id: string;
  campaignId: string;
  status: ScheduledEffectStatus;
  effectKind: ScheduledEffectKind;
  title: string;
  narrative: string | null;
  recurrenceRule: ScheduledEffectRecurrence;
  anchorEpochMinute: string;
  nextFireEpochMinute: string;
  lastFiredEpochMinute: string | null;
  effectPayload: Record<string, unknown> | null;
  ledgerEntryKind: 'credit' | 'debit' | null;
  ledgerCategory: string | null;
  amount: number | null;
  havenWikiPageId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledEffectSummary = ScheduledEffectCore & {
  nextFireLabel: string | null;
  recurrenceLabel: string;
  havenTitle: string | null;
  havenHref: string | null;
  canManage: boolean;
  lastFiredAtLabel: string | null;
  lastOutcome: ScheduledEffectOccurrenceStatus | null;
  lastSuppressionReasonLabel: string | null;
};

export type ScheduledEffectOccurrenceSummary = {
  id: string;
  scheduledEffectId: string;
  effectKind: ScheduledEffectKind;
  fireAtEpochMinute: string;
  fireAtLabel: string | null;
  status: ScheduledEffectOccurrenceStatus;
  suppressionReason: ScheduledEffectSuppressionReason | null;
  suppressionReasonLabel: string | null;
  worldEventSuggestionId: string | null;
  createdAt: string;
};

export type ScheduledTreasuryPulseHint = {
  activeCount: number;
  nextDueLabel: string | null;
};

const MINUTES_PER_DAY = 1440;

export function normalizeScheduledEffectStatus(raw: unknown): ScheduledEffectStatus {
  if (typeof raw !== 'string') return 'active';
  const lower = raw.trim().toLowerCase();
  return SCHEDULED_EFFECT_STATUSES.find((status) => status === lower) ?? 'active';
}

export function normalizeScheduledEffectKind(raw: unknown): ScheduledEffectKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return SCHEDULED_EFFECT_KINDS.find((kind) => kind === lower) ?? null;
}

export function normalizeScheduledEffectListScope(raw: unknown): ScheduledEffectListScope {
  if (typeof raw !== 'string') return 'treasury';
  const lower = raw.trim().toLowerCase();
  return SCHEDULED_EFFECT_LIST_SCOPES.find((scope) => scope === lower) ?? 'treasury';
}

export function isTreasuryScheduledEffectKind(
  kind: ScheduledEffectKind,
): kind is TreasuryScheduledEffectKind {
  return (TREASURY_SCHEDULED_EFFECT_KINDS as readonly string[]).includes(kind);
}

export function isNarrativeScheduledEffectKind(
  kind: ScheduledEffectKind,
): kind is NarrativeScheduledEffectKind {
  return (NARRATIVE_SCHEDULED_EFFECT_KINDS as readonly string[]).includes(kind);
}

export function scheduledEffectKindsForScope(
  scope: ScheduledEffectListScope,
): ScheduledEffectKind[] | null {
  switch (scope) {
    case 'treasury':
      return [...TREASURY_SCHEDULED_EFFECT_KINDS];
    case 'narrative':
      return [...NARRATIVE_SCHEDULED_EFFECT_KINDS];
    case 'all':
      return null;
  }
}

export function normalizeScheduledEffectOccurrenceStatus(
  raw: unknown,
): ScheduledEffectOccurrenceStatus | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'FIRED') return 'fired';
  if (upper === 'SUPPRESSED') return 'suppressed';
  const lower = raw.trim().toLowerCase();
  return SCHEDULED_EFFECT_OCCURRENCE_STATUSES.find((status) => status === lower) ?? null;
}

export function normalizeScheduledEffectSuppressionReason(
  raw: unknown,
): ScheduledEffectSuppressionReason | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  return (
    SCHEDULED_EFFECT_SUPPRESSION_REASONS.find((reason) => reason === upper) ?? null
  );
}

export function scheduledEffectSuppressionReasonLabel(
  reason: ScheduledEffectSuppressionReason | null | undefined,
): string | null {
  if (!reason) return null;
  return SCHEDULED_EFFECT_SUPPRESSION_REASON_LABELS[reason] ?? reason;
}

function normalizePositiveInt(raw: unknown, fallback: number, max?: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  const value = Math.floor(raw);
  if (value <= 0) return fallback;
  if (max != null) return Math.min(value, max);
  return value;
}

export function normalizeDurationRecurrence(raw: unknown): DurationRecurrence | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.kind !== 'duration') return null;
  const intervalMinutes = normalizePositiveInt(record.intervalMinutes, 0);
  if (intervalMinutes <= 0) return null;
  return { kind: 'duration', intervalMinutes };
}

export function normalizeCalendarMonthRecurrence(raw: unknown): CalendarMonthRecurrence | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.kind !== 'calendar_month') return null;
  const dayOfMonth = normalizePositiveInt(record.dayOfMonth, 1, 28);
  const monthInterval = normalizePositiveInt(record.monthInterval ?? 1, 1, 12);
  return { kind: 'calendar_month', dayOfMonth, monthInterval };
}

export function normalizeScheduledEffectRecurrence(raw: unknown): ScheduledEffectRecurrence | null {
  return normalizeDurationRecurrence(raw) ?? normalizeCalendarMonthRecurrence(raw);
}

/** UI presets normalize to stored intervalMinutes. */
export function durationRecurrenceFromDays(days: number): DurationRecurrence {
  const safeDays = Math.max(1, Math.floor(days));
  return { kind: 'duration', intervalMinutes: safeDays * MINUTES_PER_DAY };
}

export function durationRecurrenceFromWeeks(weeks: number): DurationRecurrence {
  const safeWeeks = Math.max(1, Math.floor(weeks));
  return { kind: 'duration', intervalMinutes: safeWeeks * 7 * MINUTES_PER_DAY };
}

export function formatRecurrenceLabel(rule: ScheduledEffectRecurrence): string {
  if (rule.kind === 'duration') {
    if (rule.intervalMinutes % (7 * MINUTES_PER_DAY) === 0) {
      const weeks = rule.intervalMinutes / (7 * MINUTES_PER_DAY);
      return weeks === 1 ? 'Every week' : `Every ${weeks} weeks`;
    }
    if (rule.intervalMinutes % MINUTES_PER_DAY === 0) {
      const days = rule.intervalMinutes / MINUTES_PER_DAY;
      return days === 1 ? 'Every day' : `Every ${days} days`;
    }
    const hours = rule.intervalMinutes / 60;
    return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
  }
  const interval = rule.monthInterval ?? 1;
  const day = rule.dayOfMonth;
  if (interval === 1) {
    return `Monthly on day ${day}`;
  }
  return `Every ${interval} months on day ${day}`;
}

export function computeDurationDueFires(input: {
  rule: DurationRecurrence;
  nextFireEpochMinute: bigint;
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
  maxFires: number;
}): { fires: bigint[]; remaining: boolean } {
  const fires: bigint[] = [];
  let cursor = input.nextFireEpochMinute;
  const interval = BigInt(input.rule.intervalMinutes);

  while (cursor <= input.nextEpochMinute && fires.length < input.maxFires) {
    if (cursor > input.previousEpochMinute) {
      fires.push(cursor);
    }
    cursor += interval;
  }

  const remaining = cursor <= input.nextEpochMinute;
  return { fires, remaining };
}

export function computeNextDurationFire(
  rule: DurationRecurrence,
  afterEpochMinute: bigint,
): bigint {
  return afterEpochMinute + BigInt(rule.intervalMinutes);
}

export function computeInitialDurationNextFire(
  rule: DurationRecurrence,
  anchorEpochMinute: bigint,
): bigint {
  return anchorEpochMinute + BigInt(rule.intervalMinutes);
}

export function buildScheduledEffectSuggestionKey(
  scheduleId: string,
  fireAtEpochMinute: string | bigint,
): string {
  return `scheduled-effect:${scheduleId}:${String(fireAtEpochMinute)}`;
}

export function buildScheduledTreasuryPulseBullets(
  hint: ScheduledTreasuryPulseHint | null,
): string[] {
  if (!hint || hint.activeCount <= 0) return [];
  const countLabel =
    hint.activeCount === 1
      ? '1 recurring treasury schedule active'
      : `${hint.activeCount} recurring treasury schedules active`;
  if (!hint.nextDueLabel) {
    return [countLabel];
  }
  return [countLabel, `Next due ${hint.nextDueLabel}`];
}
