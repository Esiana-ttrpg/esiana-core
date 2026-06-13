/**
 * Layer 2 — open narrative thread metadata (wiki-canonical).
 * @see docs/architecture-internal/narrative-threads.md
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  lifecycleTargetForThreadStatusPatch,
  lifecycleToThreadStatus as lifecycleToThreadStatusFromMatrix,
} from './threadLifecycleMatrix.js';

export const THREAD_METADATA_VERSION = 'thread-metadata-v1';

export const THREAD_KINDS = [
  'mystery',
  'promise',
  'foreshadowing',
  'clue',
  'theory',
] as const;

export type ThreadKind = (typeof THREAD_KINDS)[number];

export const THREAD_STATUSES = [
  'OPEN',
  'DORMANT',
  'RESOLVED',
  'ABANDONED',
] as const;

export type ThreadStatus = (typeof THREAD_STATUSES)[number];

export const DEFAULT_THREAD_STATUS: ThreadStatus = 'OPEN';

export const THREAD_NARRATIVE_WEIGHTS = ['minor', 'major', 'critical'] as const;

export type ThreadNarrativeWeight = (typeof THREAD_NARRATIVE_WEIGHTS)[number];

export const DEFAULT_THREAD_NARRATIVE_WEIGHT: ThreadNarrativeWeight = 'major';

export const EMOTIONAL_RESIDUE_KINDS = [
  'grief',
  'revenge',
  'rivalry',
  'romance',
  'debt',
  'other',
] as const;

export type EmotionalResidueKind = (typeof EMOTIONAL_RESIDUE_KINDS)[number];

export interface ThreadMetadataFields {
  threadMetadataVersion: string;
  threadKind: ThreadKind;
  threadStatus: ThreadStatus;
  narrativeWeight: ThreadNarrativeWeight;
  relatedPageIds: string[];
  introducedSessionId: string | null;
  lastAdvancedSessionId: string | null;
  resolvedSessionId: string | null;
  payoffPageId: string | null;
  playerSubmitted: boolean;
  sortOrder: number | null;
  emotionalResidueKind: EmotionalResidueKind | null;
}

export function normalizeThreadKind(raw: unknown): ThreadKind {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((THREAD_KINDS as readonly string[]).includes(lower)) {
      return lower as ThreadKind;
    }
  }
  return 'mystery';
}

export function normalizeThreadStatus(raw: unknown): ThreadStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((THREAD_STATUSES as readonly string[]).includes(upper)) {
      return upper as ThreadStatus;
    }
  }
  return DEFAULT_THREAD_STATUS;
}

export function normalizeRelatedPageIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' && entry.trim()) {
      ids.push(entry.trim());
    }
  }
  return [...new Set(ids)];
}

export function normalizeNullableId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSortOrder(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizePlayerSubmitted(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === 1 || raw === '1';
}

export function normalizeEmotionalResidueKind(
  raw: unknown,
): EmotionalResidueKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((EMOTIONAL_RESIDUE_KINDS as readonly string[]).includes(lower)) {
    return lower as EmotionalResidueKind;
  }
  return null;
}

export function normalizeThreadNarrativeWeight(raw: unknown): ThreadNarrativeWeight {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((THREAD_NARRATIVE_WEIGHTS as readonly string[]).includes(lower)) {
      return lower as ThreadNarrativeWeight;
    }
  }
  return DEFAULT_THREAD_NARRATIVE_WEIGHT;
}

/** Strict parse for create/PATCH — returns null when invalid. */
export function parseThreadNarrativeWeightStrict(
  raw: unknown,
): ThreadNarrativeWeight | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((THREAD_NARRATIVE_WEIGHTS as readonly string[]).includes(lower)) {
    return lower as ThreadNarrativeWeight;
  }
  return null;
}

/** Strict kind for create — returns null when not one of THREAD_KINDS. */
export function parseThreadKindStrict(raw: unknown): ThreadKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((THREAD_KINDS as readonly string[]).includes(lower)) {
    return lower as ThreadKind;
  }
  return null;
}

function buildThreadFieldsFromRaw(raw: Record<string, unknown>): ThreadMetadataFields {
  const threadKind = normalizeThreadKind(raw.threadKind);
  const playerSubmitted =
    threadKind === 'theory' ? true : normalizePlayerSubmitted(raw.playerSubmitted);

  return {
    threadMetadataVersion:
      typeof raw.threadMetadataVersion === 'string' && raw.threadMetadataVersion.trim()
        ? raw.threadMetadataVersion.trim()
        : THREAD_METADATA_VERSION,
    threadKind,
    threadStatus: normalizeThreadStatus(raw.threadStatus),
    narrativeWeight: normalizeThreadNarrativeWeight(raw.narrativeWeight),
    relatedPageIds: normalizeRelatedPageIds(raw.relatedPageIds),
    introducedSessionId: normalizeNullableId(raw.introducedSessionId),
    lastAdvancedSessionId: normalizeNullableId(raw.lastAdvancedSessionId),
    resolvedSessionId: normalizeNullableId(raw.resolvedSessionId),
    payoffPageId: normalizeNullableId(raw.payoffPageId),
    playerSubmitted,
    sortOrder: normalizeSortOrder(raw.sortOrder),
    emotionalResidueKind: normalizeEmotionalResidueKind(raw.emotionalResidueKind),
  };
}

export function parseThreadMetadata(metadata: unknown): ThreadMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return emptyThreadMetadata();
  }
  return buildThreadFieldsFromRaw(metadata as Record<string, unknown>);
}

export interface ParseThreadMetadataResult {
  fields: ThreadMetadataFields;
  warnings: string[];
}

export function parseThreadMetadataWithWarnings(
  metadata: unknown,
): ParseThreadMetadataResult {
  const warnings: string[] = [];
  if (!metadata || typeof metadata !== 'object') {
    return { fields: emptyThreadMetadata(), warnings };
  }
  const raw = metadata as Record<string, unknown>;
  if (raw.threadKind !== undefined && typeof raw.threadKind === 'string') {
    const lower = raw.threadKind.trim().toLowerCase();
    if (lower && !(THREAD_KINDS as readonly string[]).includes(lower)) {
      warnings.push('Unknown thread kind normalized to Mystery');
    }
  }
  if (raw.narrativeWeight !== undefined && typeof raw.narrativeWeight === 'string') {
    const lower = raw.narrativeWeight.trim().toLowerCase();
    if (lower && !(THREAD_NARRATIVE_WEIGHTS as readonly string[]).includes(lower)) {
      warnings.push('Unknown narrative weight normalized to Major');
    }
  }
  return { fields: buildThreadFieldsFromRaw(raw), warnings };
}

export function emptyThreadMetadata(): ThreadMetadataFields {
  return {
    threadMetadataVersion: THREAD_METADATA_VERSION,
    threadKind: 'mystery',
    threadStatus: DEFAULT_THREAD_STATUS,
    narrativeWeight: DEFAULT_THREAD_NARRATIVE_WEIGHT,
    relatedPageIds: [],
    introducedSessionId: null,
    lastAdvancedSessionId: null,
    resolvedSessionId: null,
    payoffPageId: null,
    playerSubmitted: false,
    sortOrder: null,
    emotionalResidueKind: null,
  };
}

export function isThreadMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return (
    raw.threadKind !== undefined ||
    raw.threadStatus !== undefined ||
    raw.narrativeWeight !== undefined ||
    raw.relatedPageIds !== undefined ||
    raw.introducedSessionId !== undefined ||
    raw.lastAdvancedSessionId !== undefined ||
    raw.resolvedSessionId !== undefined ||
    raw.payoffPageId !== undefined ||
    raw.playerSubmitted !== undefined ||
    raw.sortOrder !== undefined ||
    raw.emotionalResidueKind !== undefined
  );
}

/** Backfill / hint mapping from published threadStatus. */
export function publishedThreadStatusToLifecycleHint(
  status: unknown,
): NarrativeLifecycleState {
  if (typeof status !== 'string') {
    return NarrativeLifecycleStates.DISCOVERED;
  }
  switch (status.trim().toUpperCase()) {
    case 'DORMANT':
      return NarrativeLifecycleStates.DISCOVERED;
    case 'RESOLVED':
      return NarrativeLifecycleStates.COMPLETED;
    case 'ABANDONED':
      return NarrativeLifecycleStates.FAILED;
    case 'OPEN':
    default:
      return NarrativeLifecycleStates.ACTIVE;
  }
}

export function lifecycleToThreadStatus(
  state: NarrativeLifecycleState,
  existingStatus?: ThreadStatus,
): ThreadStatus {
  return lifecycleToThreadStatusFromMatrix(state, existingStatus);
}

/** @deprecated Use lifecycleTargetForThreadStatusPatch from threadLifecycleMatrix */
export function publishedThreadStatusToLifecycleTarget(
  status: ThreadStatus,
  currentLifecycle: NarrativeLifecycleState,
): NarrativeLifecycleState | null {
  return lifecycleTargetForThreadStatusPatch(status, currentLifecycle);
}

export { lifecycleTargetForThreadStatusPatch } from './threadLifecycleMatrix.js';
