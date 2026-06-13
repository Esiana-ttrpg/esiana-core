/**
 * Layer 5 — narrative scene metadata (wiki-canonical).
 * @see docs/architecture-internal/narrative-scenes.md
 */
import type { BranchCondition } from './narrativeBranch.js';
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  lifecycleTargetForSceneStatusPatch,
  lifecycleToSceneStatus as lifecycleToSceneStatusFromMatrix,
} from './sceneLifecycleMatrix.js';

export const SCENE_METADATA_VERSION = 'scene-metadata-v1';

export const SCENE_STATUSES = ['PLANNED', 'READY', 'PLAYED', 'SKIPPED'] as const;

export type SceneStatus = (typeof SCENE_STATUSES)[number];

export const DEFAULT_SCENE_STATUS: SceneStatus = 'PLANNED';

export const SCENE_NARRATIVE_WEIGHTS = ['minor', 'major', 'critical'] as const;

export type SceneNarrativeWeight = (typeof SCENE_NARRATIVE_WEIGHTS)[number];

export const DEFAULT_SCENE_NARRATIVE_WEIGHT: SceneNarrativeWeight = 'major';

export const SCENE_BEAT_TYPES = [
  'reveal',
  'complication',
  'choice',
  'escalation',
  'twist',
  'reversal',
  'resolution',
  'fallout',
  'setup',
  'loss',
] as const;

export type SceneBeatType = (typeof SCENE_BEAT_TYPES)[number];

export const SCENE_KINDS = [
  'investigation',
  'faction',
  'environmental',
  'downtime',
  'flashback',
  'travel',
  'ambient',
  'combat',
  'social',
  'other',
] as const;

export type SceneKind = (typeof SCENE_KINDS)[number];

export const SCENE_OUTCOMES = [
  'information_revealed',
  'relationship_shift',
  'faction_escalation',
  'world_state_change',
  'location_unlock',
  'quest_unlock',
  'threat_progression',
  'resource_loss',
] as const;

export type SceneOutcome = (typeof SCENE_OUTCOMES)[number];

export interface SceneOutcomeEntry {
  outcomeType: SceneOutcome;
  description?: string | null;
  linkedPageIds?: string[];
}

export interface SceneMetadataFields {
  sceneMetadataVersion: string;
  sceneStatus: SceneStatus;
  narrativeWeight: SceneNarrativeWeight;
  beatType: SceneBeatType | null;
  tone: string | null;
  pacingTags: string[];
  sceneKind: SceneKind | null;
  summary: string | null;
  entryConditions: BranchCondition[];
  exitConditions: BranchCondition[];
  outcomes: SceneOutcomeEntry[];
  participantPageIds: string[];
  locationPageId: string | null;
  linkedQuestPageIds: string[];
  linkedObjectivePageIds: string[];
  linkedCluePageIds: string[];
  linkedThreadPageIds: string[];
  consequencePageIds: string[];
  followsScenePageIds: string[];
  plannedSessionId: string | null;
  playedSessionId: string | null;
  gmNotes: string | null;
  sortOrder: number | null;
}

export function normalizeSceneStatus(raw: unknown): SceneStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((SCENE_STATUSES as readonly string[]).includes(upper)) {
      return upper as SceneStatus;
    }
  }
  return DEFAULT_SCENE_STATUS;
}

export function normalizeSceneNarrativeWeight(raw: unknown): SceneNarrativeWeight {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((SCENE_NARRATIVE_WEIGHTS as readonly string[]).includes(lower)) {
      return lower as SceneNarrativeWeight;
    }
  }
  return DEFAULT_SCENE_NARRATIVE_WEIGHT;
}

export function parseSceneNarrativeWeightStrict(raw: unknown): SceneNarrativeWeight | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((SCENE_NARRATIVE_WEIGHTS as readonly string[]).includes(lower)) {
    return lower as SceneNarrativeWeight;
  }
  return null;
}

export function normalizeSceneBeatType(raw: unknown): SceneBeatType | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((SCENE_BEAT_TYPES as readonly string[]).includes(lower)) {
    return lower as SceneBeatType;
  }
  return null;
}

export function normalizeSceneKind(raw: unknown): SceneKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((SCENE_KINDS as readonly string[]).includes(lower)) {
    return lower as SceneKind;
  }
  return null;
}

export function normalizeSceneOutcome(raw: unknown): SceneOutcome | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if ((SCENE_OUTCOMES as readonly string[]).includes(lower)) {
    return lower as SceneOutcome;
  }
  return null;
}

export function normalizeStringArray(raw: unknown): string[] {
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

export function normalizeNullableString(raw: unknown): string | null {
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

function normalizeBranchCondition(raw: unknown): BranchCondition | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type === 'lifecycle' && typeof obj.subjectId === 'string' && typeof obj.state === 'string') {
    return { type: 'lifecycle', subjectId: obj.subjectId, state: obj.state as NarrativeLifecycleState };
  }
  if (type === 'calendar_event' && typeof obj.eventId === 'string') {
    return { type: 'calendar_event', eventId: obj.eventId };
  }
  if (
    type === 'graph_edge' &&
    typeof obj.sourcePageId === 'string' &&
    typeof obj.targetPageId === 'string' &&
    typeof obj.kind === 'string'
  ) {
    return {
      type: 'graph_edge',
      sourcePageId: obj.sourcePageId,
      targetPageId: obj.targetPageId,
      kind: obj.kind,
    };
  }
  if (type === 'manual_flag' && typeof obj.key === 'string' && typeof obj.value === 'boolean') {
    return { type: 'manual_flag', key: obj.key, value: obj.value };
  }
  return null;
}

export function normalizeBranchConditions(raw: unknown): BranchCondition[] {
  if (!Array.isArray(raw)) return [];
  const conditions: BranchCondition[] = [];
  for (const entry of raw) {
    const parsed = normalizeBranchCondition(entry);
    if (parsed) conditions.push(parsed);
  }
  return conditions;
}

/** @deprecated Use normalizeBranchConditions */
export function normalizeEntryConditions(raw: unknown): BranchCondition[] {
  return normalizeBranchConditions(raw);
}

export function normalizeSceneOutcomes(raw: unknown): SceneOutcomeEntry[] {
  if (!Array.isArray(raw)) return [];
  const outcomes: SceneOutcomeEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const outcomeType = normalizeSceneOutcome(obj.outcomeType);
    if (!outcomeType) continue;
    outcomes.push({
      outcomeType,
      description: normalizeNullableString(obj.description),
      linkedPageIds: normalizeStringArray(obj.linkedPageIds),
    });
  }
  return outcomes;
}

function buildSceneFieldsFromRaw(raw: Record<string, unknown>): SceneMetadataFields {
  return {
    sceneMetadataVersion:
      typeof raw.sceneMetadataVersion === 'string' && raw.sceneMetadataVersion.trim()
        ? raw.sceneMetadataVersion.trim()
        : SCENE_METADATA_VERSION,
    sceneStatus: normalizeSceneStatus(raw.sceneStatus),
    narrativeWeight: normalizeSceneNarrativeWeight(raw.narrativeWeight),
    beatType: normalizeSceneBeatType(raw.beatType),
    tone: normalizeNullableString(raw.tone),
    pacingTags: normalizeStringArray(raw.pacingTags),
    sceneKind: normalizeSceneKind(raw.sceneKind),
    summary: normalizeNullableString(raw.summary),
    entryConditions: normalizeBranchConditions(raw.entryConditions),
    exitConditions: normalizeBranchConditions(raw.exitConditions),
    outcomes: normalizeSceneOutcomes(raw.outcomes),
    participantPageIds: normalizeStringArray(raw.participantPageIds),
    locationPageId: normalizeNullableId(raw.locationPageId),
    linkedQuestPageIds: normalizeStringArray(raw.linkedQuestPageIds),
    linkedObjectivePageIds: normalizeStringArray(raw.linkedObjectivePageIds),
    linkedCluePageIds: normalizeStringArray(raw.linkedCluePageIds),
    linkedThreadPageIds: normalizeStringArray(raw.linkedThreadPageIds),
    consequencePageIds: normalizeStringArray(raw.consequencePageIds),
    followsScenePageIds: normalizeStringArray(raw.followsScenePageIds),
    plannedSessionId: normalizeNullableId(raw.plannedSessionId),
    playedSessionId: normalizeNullableId(raw.playedSessionId),
    gmNotes: normalizeNullableString(raw.gmNotes),
    sortOrder: normalizeSortOrder(raw.sortOrder),
  };
}

export function parseSceneMetadata(metadata: unknown): SceneMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return emptySceneMetadata();
  }
  return buildSceneFieldsFromRaw(metadata as Record<string, unknown>);
}

export interface ParseSceneMetadataResult {
  fields: SceneMetadataFields;
  warnings: string[];
}

export function parseSceneMetadataWithWarnings(metadata: unknown): ParseSceneMetadataResult {
  const warnings: string[] = [];
  if (!metadata || typeof metadata !== 'object') {
    return { fields: emptySceneMetadata(), warnings };
  }
  const raw = metadata as Record<string, unknown>;
  if (raw.beatType !== undefined && typeof raw.beatType === 'string') {
    const lower = raw.beatType.trim().toLowerCase();
    if (lower && !(SCENE_BEAT_TYPES as readonly string[]).includes(lower)) {
      warnings.push('Unknown beat type ignored');
    }
  }
  if (raw.narrativeWeight !== undefined && typeof raw.narrativeWeight === 'string') {
    const lower = raw.narrativeWeight.trim().toLowerCase();
    if (lower && !(SCENE_NARRATIVE_WEIGHTS as readonly string[]).includes(lower)) {
      warnings.push('Unknown narrative weight normalized to Major');
    }
  }
  return { fields: buildSceneFieldsFromRaw(raw), warnings };
}

export function emptySceneMetadata(): SceneMetadataFields {
  return {
    sceneMetadataVersion: SCENE_METADATA_VERSION,
    sceneStatus: DEFAULT_SCENE_STATUS,
    narrativeWeight: DEFAULT_SCENE_NARRATIVE_WEIGHT,
    beatType: null,
    tone: null,
    pacingTags: [],
    sceneKind: null,
    summary: null,
    entryConditions: [],
    exitConditions: [],
    outcomes: [],
    participantPageIds: [],
    locationPageId: null,
    linkedQuestPageIds: [],
    linkedObjectivePageIds: [],
    linkedCluePageIds: [],
    linkedThreadPageIds: [],
    consequencePageIds: [],
    followsScenePageIds: [],
    plannedSessionId: null,
    playedSessionId: null,
    gmNotes: null,
    sortOrder: null,
  };
}

export function isSceneMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return (
    raw.sceneStatus !== undefined ||
    raw.beatType !== undefined ||
    raw.narrativeWeight !== undefined ||
    raw.summary !== undefined ||
    raw.entryConditions !== undefined ||
    raw.exitConditions !== undefined ||
    raw.outcomes !== undefined ||
    raw.participantPageIds !== undefined ||
    raw.linkedQuestPageIds !== undefined ||
    raw.linkedObjectivePageIds !== undefined ||
    raw.followsScenePageIds !== undefined ||
    raw.gmNotes !== undefined
  );
}

export function publishedSceneStatusToLifecycleHint(status: unknown): NarrativeLifecycleState {
  if (typeof status !== 'string') {
    return NarrativeLifecycleStates.LOCKED;
  }
  switch (status.trim().toUpperCase()) {
    case 'READY':
      return NarrativeLifecycleStates.DISCOVERED;
    case 'PLAYED':
      return NarrativeLifecycleStates.COMPLETED;
    case 'SKIPPED':
      return NarrativeLifecycleStates.FAILED;
    case 'PLANNED':
    default:
      return NarrativeLifecycleStates.LOCKED;
  }
}

export function lifecycleToSceneStatus(
  state: NarrativeLifecycleState,
  existingStatus?: SceneStatus,
): SceneStatus {
  return lifecycleToSceneStatusFromMatrix(state, existingStatus);
}

export { lifecycleTargetForSceneStatusPatch } from './sceneLifecycleMatrix.js';
