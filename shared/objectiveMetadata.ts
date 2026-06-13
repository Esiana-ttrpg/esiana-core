/**
 * Layer 5 — quest-scoped objective metadata (wiki child of quest page).
 * Parent quest = wiki parentId only — never stored here.
 * @see docs/architecture-internal/narrative-objectives.md
 */
export const OBJECTIVE_METADATA_VERSION = 'objective-metadata-v1';

export const OBJECTIVE_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'SKIPPED'] as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export const DEFAULT_OBJECTIVE_STATUS: ObjectiveStatus = 'PLANNED';

export interface ObjectiveMetadataFields {
  objectiveMetadataVersion: string;
  objectiveStatus: ObjectiveStatus;
  sortOrder: number | null;
  summary: string | null;
}

export function normalizeObjectiveStatus(raw: unknown): ObjectiveStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((OBJECTIVE_STATUSES as readonly string[]).includes(upper)) {
      return upper as ObjectiveStatus;
    }
  }
  return DEFAULT_OBJECTIVE_STATUS;
}

export function normalizeSortOrder(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeNullableString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildObjectiveFieldsFromRaw(raw: Record<string, unknown>): ObjectiveMetadataFields {
  return {
    objectiveMetadataVersion:
      typeof raw.objectiveMetadataVersion === 'string' && raw.objectiveMetadataVersion.trim()
        ? raw.objectiveMetadataVersion.trim()
        : OBJECTIVE_METADATA_VERSION,
    objectiveStatus: normalizeObjectiveStatus(raw.objectiveStatus),
    sortOrder: normalizeSortOrder(raw.sortOrder),
    summary: normalizeNullableString(raw.summary),
  };
}

export function parseObjectiveMetadata(metadata: unknown): ObjectiveMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return emptyObjectiveMetadata();
  }
  return buildObjectiveFieldsFromRaw(metadata as Record<string, unknown>);
}

export function emptyObjectiveMetadata(): ObjectiveMetadataFields {
  return {
    objectiveMetadataVersion: OBJECTIVE_METADATA_VERSION,
    objectiveStatus: DEFAULT_OBJECTIVE_STATUS,
    sortOrder: null,
    summary: null,
  };
}

export function isObjectiveMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return (
    raw.objectiveStatus !== undefined ||
    raw.objectiveMetadataVersion !== undefined ||
    raw.summary !== undefined ||
    raw.sortOrder !== undefined
  );
}

/** Strip legacy relational keys that must not be persisted on objectives. */
export function sanitizeObjectiveMetadataForStorage(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...metadata };
  delete next.parentQuestPageId;
  delete next.linkedScenePageIds;
  return next;
}
