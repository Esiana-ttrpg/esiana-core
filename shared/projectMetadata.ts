/**
 * Layer 1 — downtime project simulation contracts (wiki-linked).
 * WikiPage = narrative surface; DowntimeProject row = simulation state.
 * @see docs/architecture-internal/downtime-projects.md
 */

import { parseProjectHavenEffectPayload } from './havenMetadata.js';

export const DOWNTIME_PROJECT_SEMANTICS_VERSION = 'downtime-project-v1';

export const DOWNTIME_PROJECT_TEMPLATE_TYPE = 'DOWNTIME_PROJECT';

export const PROJECT_TYPES = [
  'construction',
  'research',
  'training',
  'operations',
  'recovery',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const DEFAULT_PROJECT_TYPE: ProjectType = 'operations';

export const PROJECT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'SUSPENDED',
  'COMPLETED',
  'FAILED',
  'ABANDONED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = 'PLANNED';

export const TERMINAL_PROJECT_STATUSES = [
  'COMPLETED',
  'FAILED',
  'ABANDONED',
] as const;

export type TerminalProjectStatus = (typeof TERMINAL_PROJECT_STATUSES)[number];

export const SIMULATION_PROJECT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'SUSPENDED',
] as const;

export type SimulationProjectStatus = (typeof SIMULATION_PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const DEFAULT_PROJECT_PRIORITY: ProjectPriority = 'normal';

/** Narrative posture on wiki metadata — not simulation status. */
export const DOWNTIME_OPERATION_POSTURE_METADATA_KEY = 'downtimeOperationPosture';

export const OPERATION_POSTURES = [
  'quiet_effort',
  'public_campaign',
  'urgent_response',
  'secret_operation',
  'long_term_undertaking',
] as const;

export type OperationPosture = (typeof OPERATION_POSTURES)[number];

const OPERATION_POSTURE_LABELS: Record<OperationPosture, string> = {
  quiet_effort: 'Quiet effort',
  public_campaign: 'Public campaign',
  urgent_response: 'Urgent response',
  secret_operation: 'Secret operation',
  long_term_undertaking: 'Long-term undertaking',
};

export function normalizeOperationPosture(raw: unknown): OperationPosture | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((OPERATION_POSTURES as readonly string[]).includes(lower)) {
    return lower as OperationPosture;
  }
  return null;
}

export function formatOperationPostureLabel(posture: OperationPosture | null | undefined): string | null {
  if (!posture) return null;
  return OPERATION_POSTURE_LABELS[posture] ?? null;
}

export function parseOperationPostureFromWikiMetadata(metadata: unknown): OperationPosture | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  return normalizeOperationPosture(record[DOWNTIME_OPERATION_POSTURE_METADATA_KEY]);
}

export const PROJECT_RESOURCE_SOURCE_KINDS = [
  'manual',
  'linked_page',
  'ledger',
  'future_hook',
] as const;

export type ProjectResourceSourceKind =
  (typeof PROJECT_RESOURCE_SOURCE_KINDS)[number];

export const DEFAULT_PROJECT_RESOURCE_SOURCE_KIND: ProjectResourceSourceKind = 'manual';

export const PROJECT_OUTCOME_KINDS = [
  'unlock_entity',
  'alter_location',
  'generate_event',
  'haven_effect',
  'reputation_effect',
  'future_hook',
  'treasury_effect',
] as const;

export type ProjectOutcomeKind = (typeof PROJECT_OUTCOME_KINDS)[number];

export const PROJECT_OUTCOME_STATUSES = ['pending', 'applied'] as const;

export type ProjectOutcomeStatus = (typeof PROJECT_OUTCOME_STATUSES)[number];

export const PROJECT_OUTCOME_APPLICATION_SOURCES = [
  'project_progression',
  'manual_patch',
  'replay',
] as const;

export type ProjectOutcomeApplicationSource =
  (typeof PROJECT_OUTCOME_APPLICATION_SOURCES)[number];

export const PROJECT_RISK_SEVERITIES = ['low', 'medium', 'high'] as const;

export type ProjectRiskSeverity = (typeof PROJECT_RISK_SEVERITIES)[number];

export interface ProjectResourceEntry {
  id: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  satisfied: boolean;
  linkedPageId: string | null;
  sourceKind: ProjectResourceSourceKind;
  /** When sourceKind is ledger — optional treasury amount for suggestions. */
  ledgerAmount?: number | null;
  /** credit | debit when sourceKind is ledger. */
  ledgerImpactKind?: 'credit' | 'debit' | null;
}

export type ProjectTreasuryEffectPayload = {
  amount: number;
  kind: 'credit' | 'debit';
  category?: LedgerCategoryLike | null;
  title?: string | null;
};

type LedgerCategoryLike =
  | 'upkeep'
  | 'project'
  | 'income'
  | 'reward'
  | 'trade'
  | 'donation'
  | 'debt'
  | 'other';

export interface ProjectBlockerEntry {
  id: string;
  label: string;
  description: string | null;
  resolved: boolean;
  linkedPageId: string | null;
}

export interface ProjectOutcomeEntry {
  id: string;
  outcomeKind: ProjectOutcomeKind;
  description: string | null;
  linkedPageIds: string[];
  status: ProjectOutcomeStatus;
  appliedAtEpochMinute?: string | null;
  applicationSource?: ProjectOutcomeApplicationSource | null;
  applicationRunId?: string | null;
  /** Structured payload for `haven_effect` outcomes. */
  havenEffect?: import('./havenMetadata.js').ProjectHavenEffectPayload | null;
  /** Structured payload for `treasury_effect` outcomes. */
  treasuryEffect?: ProjectTreasuryEffectPayload | null;
}

export interface ProjectRiskEntry {
  id: string;
  label: string;
  severity: ProjectRiskSeverity | null;
  description: string | null;
  linkedPageId: string | null;
}

export interface DowntimeProjectFields {
  semanticsVersion: string;
  projectType: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  progressPercent: number;
  durationTotalMinutes: bigint;
  durationElapsedMinutes: bigint;
  stalledDurationMinutes: bigint;
  startedAtEpochMinute: bigint | null;
  completedAtEpochMinute: bigint | null;
  targetCompletionEpochMinute: bigint | null;
  ownerPageId: string | null;
  havenPageId: string | null;
  relatedPageIds: string[];
  resources: ProjectResourceEntry[];
  blockers: ProjectBlockerEntry[];
  outcomes: ProjectOutcomeEntry[];
  risks: ProjectRiskEntry[];
}

export type DowntimeProjectSummary = {
  id: string;
  wikiPageId: string;
  title: string;
  href: string;
  projectType: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  progressPercent: number;
  durationTotalMinutes: string;
  durationElapsedMinutes: string;
  stalledDurationMinutes: string;
  startedAtEpochMinute: string | null;
  completedAtEpochMinute: string | null;
  ownerPageId: string | null;
  havenPageId: string | null;
  updatedAt: string;
};

export type DowntimeProjectDetail = DowntimeProjectSummary & {
  targetCompletionEpochMinute: string | null;
  relatedPageIds: string[];
  resources: ProjectResourceEntry[];
  blockers: ProjectBlockerEntry[];
  outcomes: ProjectOutcomeEntry[];
  risks: ProjectRiskEntry[];
  semanticsVersion: string;
  createdAt: string;
  /** Narrative posture from wiki metadata. */
  operationPosture: OperationPosture | null;
};

const PRIORITY_SORT_ORDER: Record<ProjectPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function projectPrioritySortKey(priority: ProjectPriority | null | undefined): number {
  if (!priority) return PRIORITY_SORT_ORDER.normal;
  return PRIORITY_SORT_ORDER[priority] ?? PRIORITY_SORT_ORDER.normal;
}

export function compareProjectSummariesByPriority(
  a: Pick<DowntimeProjectSummary, 'priority' | 'title'>,
  b: Pick<DowntimeProjectSummary, 'priority' | 'title'>,
): number {
  const priorityDiff =
    projectPrioritySortKey(a.priority) - projectPrioritySortKey(b.priority);
  if (priorityDiff !== 0) return priorityDiff;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function isTerminalProjectStatus(status: ProjectStatus): boolean {
  return (TERMINAL_PROJECT_STATUSES as readonly string[]).includes(status);
}

export function isSimulationProjectStatus(status: ProjectStatus): boolean {
  return (SIMULATION_PROJECT_STATUSES as readonly string[]).includes(status);
}

const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNED: ['ACTIVE', 'ABANDONED'],
  ACTIVE: ['PAUSED', 'SUSPENDED', 'COMPLETED', 'FAILED', 'ABANDONED'],
  PAUSED: ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'FAILED', 'ABANDONED'],
  SUSPENDED: ['ACTIVE', 'PAUSED', 'FAILED', 'ABANDONED'],
  COMPLETED: [],
  FAILED: [],
  ABANDONED: [],
};

export function isValidProjectStatusTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (from === to) return true;
  return (ALLOWED_STATUS_TRANSITIONS[from] as readonly string[]).includes(to);
}

export function normalizeProjectType(raw: unknown): ProjectType {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((PROJECT_TYPES as readonly string[]).includes(lower)) {
      return lower as ProjectType;
    }
  }
  return DEFAULT_PROJECT_TYPE;
}

export function normalizeProjectStatus(raw: unknown): ProjectStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((PROJECT_STATUSES as readonly string[]).includes(upper)) {
      return upper as ProjectStatus;
    }
  }
  return DEFAULT_PROJECT_STATUS;
}

export function normalizeProjectPriority(raw: unknown): ProjectPriority | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((PROJECT_PRIORITIES as readonly string[]).includes(lower)) {
      return lower as ProjectPriority;
    }
  }
  return DEFAULT_PROJECT_PRIORITY;
}

export function normalizeNullableString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function normalizeEntryId(raw: unknown, fallbackLabel: string): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return `entry-${fallbackLabel.toLowerCase().replace(/\s+/g, '-').slice(0, 48)}`;
}

export function normalizeProjectResourceSourceKind(
  raw: unknown,
): ProjectResourceSourceKind {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((PROJECT_RESOURCE_SOURCE_KINDS as readonly string[]).includes(lower)) {
      return lower as ProjectResourceSourceKind;
    }
  }
  return DEFAULT_PROJECT_RESOURCE_SOURCE_KIND;
}

export function normalizeProjectResourceEntry(raw: unknown): ProjectResourceEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  const quantity =
    typeof record.quantity === 'number' && Number.isFinite(record.quantity)
      ? record.quantity
      : null;
  return {
    id: normalizeEntryId(record.id, label),
    label,
    quantity,
    unit: normalizeNullableString(record.unit),
    satisfied: record.satisfied === true,
    linkedPageId: normalizeNullableString(record.linkedPageId),
    sourceKind: normalizeProjectResourceSourceKind(record.sourceKind),
    ledgerAmount:
      typeof record.ledgerAmount === 'number' && Number.isFinite(record.ledgerAmount)
        ? Math.floor(record.ledgerAmount)
        : null,
    ledgerImpactKind:
      record.ledgerImpactKind === 'credit' || record.ledgerImpactKind === 'debit'
        ? record.ledgerImpactKind
        : null,
  };
}

export function normalizeProjectBlockerEntry(raw: unknown): ProjectBlockerEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeEntryId(record.id, label),
    label,
    description: normalizeNullableString(record.description),
    resolved: record.resolved === true,
    linkedPageId: normalizeNullableString(record.linkedPageId),
  };
}

export function normalizeProjectOutcomeKind(raw: unknown): ProjectOutcomeKind {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((PROJECT_OUTCOME_KINDS as readonly string[]).includes(lower)) {
      return lower as ProjectOutcomeKind;
    }
  }
  return 'future_hook';
}

export function normalizeProjectOutcomeStatus(raw: unknown): ProjectOutcomeStatus {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((PROJECT_OUTCOME_STATUSES as readonly string[]).includes(lower)) {
      return lower as ProjectOutcomeStatus;
    }
  }
  return 'pending';
}

export function normalizeProjectOutcomeApplicationSource(
  raw: unknown,
): ProjectOutcomeApplicationSource | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((PROJECT_OUTCOME_APPLICATION_SOURCES as readonly string[]).includes(lower)) {
    return lower as ProjectOutcomeApplicationSource;
  }
  return null;
}

export function parseProjectTreasuryEffectPayload(
  raw: unknown,
): ProjectTreasuryEffectPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const amount =
    typeof record.amount === 'number' && Number.isFinite(record.amount)
      ? Math.floor(record.amount)
      : null;
  if (amount == null || amount <= 0) return null;
  const kind = record.kind === 'credit' || record.kind === 'debit' ? record.kind : null;
  if (!kind) return null;
  const categoryRaw = record.category;
  const category =
    typeof categoryRaw === 'string' &&
    [
      'upkeep',
      'project',
      'income',
      'reward',
      'trade',
      'donation',
      'debt',
      'other',
    ].includes(categoryRaw)
      ? (categoryRaw as LedgerCategoryLike)
      : null;
  const title =
    typeof record.title === 'string' && record.title.trim() ? record.title.trim() : null;
  return { amount, kind, category, title };
}

export function normalizeProjectOutcomeEntry(raw: unknown): ProjectOutcomeEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const description = normalizeNullableString(record.description);
  const kind = normalizeProjectOutcomeKind(record.outcomeKind);
  const id = normalizeEntryId(record.id, description ?? kind);
  return {
    id,
    outcomeKind: kind,
    description,
    linkedPageIds: normalizeStringArray(record.linkedPageIds),
    status: normalizeProjectOutcomeStatus(record.status),
    appliedAtEpochMinute:
      record.appliedAtEpochMinute !== undefined
        ? (() => {
            const parsed = normalizeNullableBigInt(record.appliedAtEpochMinute);
            return parsed != null ? parsed.toString() : null;
          })()
        : undefined,
    applicationSource: normalizeProjectOutcomeApplicationSource(record.applicationSource),
    applicationRunId: normalizeNullableString(record.applicationRunId),
    havenEffect:
      record.havenEffect !== undefined
        ? parseProjectHavenEffectPayload(record.havenEffect)
        : undefined,
    treasuryEffect:
      record.treasuryEffect !== undefined
        ? parseProjectTreasuryEffectPayload(record.treasuryEffect)
        : undefined,
  };
}

export function normalizeProjectRiskSeverity(raw: unknown): ProjectRiskSeverity | null {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((PROJECT_RISK_SEVERITIES as readonly string[]).includes(lower)) {
      return lower as ProjectRiskSeverity;
    }
  }
  return null;
}

export function normalizeProjectRiskEntry(raw: unknown): ProjectRiskEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeEntryId(record.id, label),
    label,
    severity: normalizeProjectRiskSeverity(record.severity),
    description: normalizeNullableString(record.description),
    linkedPageId: normalizeNullableString(record.linkedPageId),
  };
}

function normalizeEntryArray<T>(
  raw: unknown,
  normalizer: (item: unknown) => T | null,
): T[] {
  if (!Array.isArray(raw)) return [];
  const result: T[] = [];
  for (const item of raw) {
    const parsed = normalizer(item);
    if (parsed) result.push(parsed);
  }
  return result;
}

export function normalizeBigIntField(raw: unknown, fallback = 0n): bigint {
  if (typeof raw === 'bigint') return raw >= 0n ? raw : fallback;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return BigInt(Math.trunc(raw));
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = BigInt(raw.trim());
      return parsed >= 0n ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function normalizeNullableBigInt(raw: unknown): bigint | null {
  if (raw === null || raw === undefined) return null;
  const parsed = normalizeBigIntField(raw, -1n);
  return parsed >= 0n ? parsed : null;
}

export function normalizeProgressPercent(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Presentation-oriented progress derived from elapsed/total minutes.
 * Canonical simulation truth remains duration fields + status.
 */
export function computeProgressPercent(
  elapsedMinutes: bigint,
  totalMinutes: bigint,
): number {
  if (totalMinutes <= 0n) return 0;
  if (elapsedMinutes <= 0n) return 0;
  if (elapsedMinutes >= totalMinutes) return 100;
  const percent = Number((elapsedMinutes * 100n) / totalMinutes);
  return normalizeProgressPercent(percent);
}

const MINUTES_PER_DAY = 1440n;

/** Gate: all blockers resolved and all resources satisfied. */
export function canProjectProgress(fields: DowntimeProjectFields): boolean {
  if (fields.status !== 'ACTIVE') return false;
  if (fields.blockers.some((entry) => !entry.resolved)) return false;
  if (fields.resources.some((entry) => !entry.satisfied)) return false;
  return true;
}

export function shouldAccumulateStall(
  status: ProjectStatus,
  canProgress: boolean,
): boolean {
  if (status === 'PAUSED' || status === 'SUSPENDED') return true;
  if (status === 'ACTIVE' && !canProgress) return true;
  return false;
}

export function accumulateProjectStall(
  fields: DowntimeProjectFields,
  deltaMinutes: bigint,
): DowntimeProjectFields {
  if (deltaMinutes <= 0n) return fields;
  return {
    ...fields,
    stalledDurationMinutes: fields.stalledDurationMinutes + deltaMinutes,
  };
}

export type ProjectAdvanceResult = {
  fields: DowntimeProjectFields;
  completed: boolean;
  stalled: boolean;
  progressed: boolean;
};

function completeProjectFields(
  fields: DowntimeProjectFields,
  nextEpochMinute: bigint,
): DowntimeProjectFields {
  const total = fields.durationTotalMinutes;
  const elapsed =
    total > 0n && fields.durationElapsedMinutes < total
      ? total
      : fields.durationElapsedMinutes;
  return {
    ...fields,
    status: 'COMPLETED',
    durationElapsedMinutes: elapsed,
    progressPercent: computeProgressPercent(elapsed, total),
    completedAtEpochMinute:
      fields.completedAtEpochMinute ?? nextEpochMinute,
  };
}

/**
 * Apply one time-advance tick to simulation fields (pure).
 * Caller persists when result indicates change.
 */
export function advanceProjectElapsed(
  fields: DowntimeProjectFields,
  deltaMinutes: bigint,
  nextEpochMinute: bigint,
): ProjectAdvanceResult {
  if (deltaMinutes <= 0n || isTerminalProjectStatus(fields.status)) {
    return { fields, completed: false, stalled: false, progressed: false };
  }

  const progressAllowed = canProjectProgress(fields);

  if (shouldAccumulateStall(fields.status, progressAllowed)) {
    const stalledFields = accumulateProjectStall(fields, deltaMinutes);
    return {
      fields: stalledFields,
      completed: false,
      stalled: true,
      progressed: false,
    };
  }

  if (fields.status !== 'ACTIVE' || !progressAllowed) {
    return { fields, completed: false, stalled: false, progressed: false };
  }

  if (fields.durationTotalMinutes <= 0n) {
    const completed = completeProjectFields(fields, nextEpochMinute);
    return { fields: completed, completed: true, stalled: false, progressed: true };
  }

  const nextElapsed = fields.durationElapsedMinutes + deltaMinutes;
  const cappedElapsed =
    nextElapsed >= fields.durationTotalMinutes
      ? fields.durationTotalMinutes
      : nextElapsed;

  let nextFields: DowntimeProjectFields = {
    ...fields,
    durationElapsedMinutes: cappedElapsed,
    progressPercent: computeProgressPercent(cappedElapsed, fields.durationTotalMinutes),
  };

  if (cappedElapsed >= fields.durationTotalMinutes) {
    nextFields = completeProjectFields(nextFields, nextEpochMinute);
    return {
      fields: nextFields,
      completed: true,
      stalled: false,
      progressed: true,
    };
  }

  return {
    fields: nextFields,
    completed: false,
    stalled: false,
    progressed: true,
  };
}

export function formatProjectRemainingLabel(
  elapsedMinutes: bigint,
  totalMinutes: bigint,
): string | null {
  if (totalMinutes <= 0n) return null;
  if (elapsedMinutes >= totalMinutes) return null;
  const remaining = totalMinutes - elapsedMinutes;
  if (remaining < MINUTES_PER_DAY) return 'Less than a day remaining';
  const days = remaining / MINUTES_PER_DAY;
  if (days === 1n) return '1 day remaining';
  if (days < 7n) return `${days.toString()} days remaining`;
  const weeks = days / 7n;
  if (weeks === 1n) return 'About 1 week remaining';
  if (weeks < 5n) return `About ${weeks.toString()} weeks remaining`;
  const months = days / 30n;
  if (months === 1n) return 'About 1 month remaining';
  return `About ${months.toString()} months remaining`;
}

export function formatProjectStalledLabel(stalledMinutes: bigint): string | null {
  if (stalledMinutes < MINUTES_PER_DAY) return null;
  const days = stalledMinutes / MINUTES_PER_DAY;
  if (days === 1n) return 'Stalled for 1 day';
  if (days < 7n) return `Stalled for ${days.toString()} days`;
  const weeks = days / 7n;
  if (weeks === 1n) return 'Stalled for 1 week';
  if (weeks < 5n) return `Stalled for ${weeks.toString()} weeks`;
  const months = days / 30n;
  if (months === 1n) return 'Stalled for 1 month';
  return `Stalled for ${months.toString()} months`;
}

export function buildProjectRequiresSummary(
  resources: ProjectResourceEntry[],
): string | null {
  const unsatisfied = resources.filter((entry) => !entry.satisfied);
  if (unsatisfied.length === 0) return null;
  const labels = unsatisfied.map((entry) => entry.label);
  return `Requires: ${labels.join(', ')}`;
}

export function buildProjectBlockersSummary(
  blockers: ProjectBlockerEntry[],
): string | null {
  const unresolved = blockers.filter((entry) => !entry.resolved);
  if (unresolved.length === 0) return null;
  const labels = unresolved.map((entry) => entry.label);
  return `Blocked by: ${labels.join(', ')}`;
}

export type ProjectClockState =
  | 'running'
  | 'waiting'
  | 'paused'
  | 'complete'
  | 'failed';

export function resolveProjectClockState(
  status: ProjectStatus,
  canProgress: boolean,
): ProjectClockState {
  if (status === 'COMPLETED') return 'complete';
  if (status === 'FAILED' || status === 'ABANDONED') return 'failed';
  if (status === 'PAUSED' || status === 'SUSPENDED') return 'paused';
  if (status === 'ACTIVE' && !canProgress) return 'waiting';
  if (status === 'ACTIVE') return 'running';
  return 'paused';
}

export function emptyDowntimeProjectFields(): DowntimeProjectFields {
  return {
    semanticsVersion: DOWNTIME_PROJECT_SEMANTICS_VERSION,
    projectType: DEFAULT_PROJECT_TYPE,
    status: DEFAULT_PROJECT_STATUS,
    priority: DEFAULT_PROJECT_PRIORITY,
    progressPercent: 0,
    durationTotalMinutes: 0n,
    durationElapsedMinutes: 0n,
    stalledDurationMinutes: 0n,
    startedAtEpochMinute: null,
    completedAtEpochMinute: null,
    targetCompletionEpochMinute: null,
    ownerPageId: null,
    havenPageId: null,
    relatedPageIds: [],
    resources: [],
    blockers: [],
    outcomes: [],
    risks: [],
  };
}

export function parseDowntimeProjectFields(raw: unknown): DowntimeProjectFields {
  if (!raw || typeof raw !== 'object') {
    return emptyDowntimeProjectFields();
  }
  const record = raw as Record<string, unknown>;
  const durationTotalMinutes = normalizeBigIntField(record.durationTotalMinutes);
  const durationElapsedMinutes = normalizeBigIntField(record.durationElapsedMinutes);
  const stalledDurationMinutes = normalizeBigIntField(record.stalledDurationMinutes);
  const derivedProgress = computeProgressPercent(
    durationElapsedMinutes,
    durationTotalMinutes,
  );
  const explicitProgress =
    record.progressPercent !== undefined
      ? normalizeProgressPercent(record.progressPercent)
      : derivedProgress;

  return {
    semanticsVersion:
      typeof record.semanticsVersion === 'string' && record.semanticsVersion.trim()
        ? record.semanticsVersion.trim()
        : DOWNTIME_PROJECT_SEMANTICS_VERSION,
    projectType: normalizeProjectType(record.projectType),
    status: normalizeProjectStatus(record.status),
    priority: normalizeProjectPriority(record.priority),
    progressPercent: explicitProgress,
    durationTotalMinutes,
    durationElapsedMinutes,
    stalledDurationMinutes,
    startedAtEpochMinute: normalizeNullableBigInt(record.startedAtEpochMinute),
    completedAtEpochMinute: normalizeNullableBigInt(record.completedAtEpochMinute),
    targetCompletionEpochMinute: normalizeNullableBigInt(
      record.targetCompletionEpochMinute,
    ),
    ownerPageId: normalizeNullableString(record.ownerPageId),
    havenPageId: normalizeNullableString(record.havenPageId),
    relatedPageIds: normalizeStringArray(record.relatedPageIds),
    resources: normalizeEntryArray(record.resources, normalizeProjectResourceEntry),
    blockers: normalizeEntryArray(record.blockers, normalizeProjectBlockerEntry),
    outcomes: normalizeEntryArray(record.outcomes, normalizeProjectOutcomeEntry),
    risks: normalizeEntryArray(record.risks, normalizeProjectRiskEntry),
  };
}

export function bigintToDto(value: bigint | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}
