import { DOWNTIME_HAVEN_TEMPLATE_TYPE } from './havenMetadata.js';
import { DOWNTIME_PROJECT_TEMPLATE_TYPE } from './projectMetadata.js';
import { normalizeEntityCategoryKey } from './entityCategoryKeys.js';

/** Legacy entity discriminators — no longer persisted or read for classification. */
export const LEGACY_ENTITY_TEMPLATE_TYPES = [
  'CHARACTER',
  'LOCATION',
  'ORGANIZATION',
  'FAMILY',
] as const;

export type LegacyEntityTemplateType =
  (typeof LEGACY_ENTITY_TEMPLATE_TYPES)[number];

/** Non-default template types with structural workflow meaning. */
export const STRUCTURAL_TEMPLATE_TYPES = [
  'QUEST',
  'SCENE',
  'SESSION_NOTE',
  DOWNTIME_HAVEN_TEMPLATE_TYPE,
  DOWNTIME_PROJECT_TEMPLATE_TYPE,
  'OBJECTIVE',
  'ARC',
  'JOURNAL',
] as const;

export type StructuralTemplateType =
  (typeof STRUCTURAL_TEMPLATE_TYPES)[number];

const LEGACY_ENTITY_TEMPLATE_SET = new Set<string>(LEGACY_ENTITY_TEMPLATE_TYPES);
const STRUCTURAL_TEMPLATE_SET = new Set<string>(STRUCTURAL_TEMPLATE_TYPES);

const LEGACY_TEMPLATE_TO_ENTITY_CATEGORY: Record<LegacyEntityTemplateType, string> = {
  CHARACTER: 'characters',
  LOCATION: 'locations',
  ORGANIZATION: 'organizations',
  FAMILY: 'families',
};

export function isLegacyEntityTemplateType(
  type: string | null | undefined,
): boolean {
  if (!type?.trim()) return false;
  return LEGACY_ENTITY_TEMPLATE_SET.has(type.trim().toUpperCase());
}

export function isStructuralTemplateType(
  type: string | null | undefined,
): boolean {
  if (!type?.trim()) return false;
  return STRUCTURAL_TEMPLATE_SET.has(type.trim().toUpperCase());
}

/** Coerce persisted templateType: legacy entity → DEFAULT; structural passes through. */
export function normalizePersistedTemplateType(
  type: string | null | undefined,
): string {
  const normalized = type?.trim().toUpperCase() || 'DEFAULT';
  if (isLegacyEntityTemplateType(normalized)) return 'DEFAULT';
  if (isStructuralTemplateType(normalized)) return normalized;
  return 'DEFAULT';
}

/** Map legacy entity templateType to metadata.entityCategory (write-path import coercion only). */
export function legacyTemplateTypeToEntityCategory(
  type: string | null | undefined,
): string | null {
  if (!type?.trim()) return null;
  const key = type.trim().toUpperCase() as LegacyEntityTemplateType;
  return LEGACY_TEMPLATE_TO_ENTITY_CATEGORY[key] ?? null;
}

export function readEntityCategoryFromMetadata(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).entityCategory;
  return normalizeEntityCategoryKey(
    typeof raw === 'string' ? raw : null,
  );
}

export type NormalizeWikiPageTemplateInput = {
  templateType?: string | null;
  metadata?: unknown;
};

export type NormalizeWikiPageTemplateResult = {
  templateType: string;
  metadata: Record<string, unknown>;
};

/** Normalize templateType and stamp entityCategory when legacy type is coerced on write. */
export function normalizeWikiPageTemplateFields(
  input: NormalizeWikiPageTemplateInput,
): NormalizeWikiPageTemplateResult {
  const baseMetadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? { ...(input.metadata as Record<string, unknown>) }
      : {};

  const incomingType = input.templateType?.trim().toUpperCase() || 'DEFAULT';
  const templateType = normalizePersistedTemplateType(incomingType);

  if (
    isLegacyEntityTemplateType(incomingType) &&
    !readEntityCategoryFromMetadata(baseMetadata)
  ) {
    const category = legacyTemplateTypeToEntityCategory(incomingType);
    if (category) {
      baseMetadata.entityCategory = category;
    }
  }

  return { templateType, metadata: baseMetadata };
}
