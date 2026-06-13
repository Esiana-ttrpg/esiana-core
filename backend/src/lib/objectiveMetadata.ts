export {
  OBJECTIVE_METADATA_VERSION,
  OBJECTIVE_STATUSES,
  DEFAULT_OBJECTIVE_STATUS,
  emptyObjectiveMetadata,
  isObjectiveMetadataPresent,
  parseObjectiveMetadata,
  sanitizeObjectiveMetadataForStorage,
  type ObjectiveMetadataFields,
  type ObjectiveStatus,
} from '../../../shared/objectiveMetadata.js';

import {
  parseObjectiveMetadata,
  sanitizeObjectiveMetadataForStorage,
  type ObjectiveMetadataFields,
} from '../../../shared/objectiveMetadata.js';

const OBJECTIVE_METADATA_KEYS = [
  'objectiveMetadataVersion',
  'objectiveStatus',
  'sortOrder',
  'summary',
] as const;

export function mergeObjectiveMetadata(
  existing: unknown,
  patch: Partial<ObjectiveMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? sanitizeObjectiveMetadataForStorage({ ...(existing as Record<string, unknown>) })
      : {};
  const parsed = parseObjectiveMetadata(base);
  const merged: ObjectiveMetadataFields = { ...parsed, ...patch };

  return sanitizeObjectiveMetadataForStorage({
    ...base,
    objectiveMetadataVersion: merged.objectiveMetadataVersion,
    objectiveStatus: merged.objectiveStatus,
    sortOrder: merged.sortOrder,
    summary: merged.summary,
  });
}

export function hasObjectiveMetadataPatch(body: Record<string, unknown>): boolean {
  return OBJECTIVE_METADATA_KEYS.some((key) => key in body);
}

export function resolveObjectiveMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasObjectiveMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasObjectiveMetadataPatch(body)) {
    return body;
  }
  return null;
}
