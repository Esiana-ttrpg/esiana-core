export {
  mergeArcMetadata,
  parseArcMetadata,
  isArcMetadataPresent,
  emptyArcMetadata,
  type ArcMetadataFields,
  type ArcKind,
} from '../../../shared/arcMetadata.js';

import { type ArcMetadataFields } from '../../../shared/arcMetadata.js';

const ARC_METADATA_KEYS = [
  'arcMetadataVersion',
  'arcKind',
  'containedPageIds',
  'actIndex',
  'pacingTarget',
] as const;

export function hasArcMetadataPatch(body: Record<string, unknown>): boolean {
  return ARC_METADATA_KEYS.some((key) => key in body);
}

export function resolveArcMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasArcMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasArcMetadataPatch(body)) {
    return body;
  }
  return null;
}

export type { ArcMetadataFields as ArcMetadataPatchFields };
