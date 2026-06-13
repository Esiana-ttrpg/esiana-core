import { readLegacyMetadataField, syncMetadataIndexFields } from './codexMetadataShared';
import { normalizeNullableText, normalizeStringArray } from './entityRelationTypes';

export interface RuleResourceMetadataFields {
  resourceType: string | null;
  scope: string | null;
  summary: string | null;
  topicTags: string[];
}

const RULE_RESOURCE_METADATA_KEYS = [
  'resourceType',
  'scope',
  'summary',
  'topicTags',
] as const;

const EMPTY: RuleResourceMetadataFields = {
  resourceType: null,
  scope: null,
  summary: null,
  topicTags: [],
};

export function parseRuleResourceMetadata(metadata: unknown): RuleResourceMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY };
  }
  const raw = metadata as Record<string, unknown>;
  const legacyTags = readLegacyMetadataField(raw, 'Tags');
  return {
    resourceType:
      normalizeNullableText(raw.resourceType) ?? readLegacyMetadataField(raw, 'Type'),
    scope: normalizeNullableText(raw.scope) ?? readLegacyMetadataField(raw, 'Parent'),
    summary: normalizeNullableText(raw.summary),
    topicTags:
      normalizeStringArray(raw.topicTags).length > 0
        ? normalizeStringArray(raw.topicTags)
        : legacyTags
          ? legacyTags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
  };
}

export function mergeRuleResourceMetadata(
  existing: unknown,
  patch: Partial<RuleResourceMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseRuleResourceMetadata(base);
  const merged: RuleResourceMetadataFields = {
    ...parsed,
    ...patch,
    topicTags: patch.topicTags ?? parsed.topicTags,
  };
  const result: Record<string, unknown> = { ...base, ...merged };
  syncMetadataIndexFields(result, {
    Type: merged.resourceType,
    Scope: merged.scope,
    Summary: merged.summary,
    Tags: merged.topicTags.join(', ') || null,
  });
  return result;
}

export function hasRuleResourceMetadataPatch(body: Record<string, unknown>): boolean {
  return RULE_RESOURCE_METADATA_KEYS.some((key) => key in body);
}

export function resolveRuleResourceMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasRuleResourceMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasRuleResourceMetadataPatch(body)) return body;
  return null;
}
