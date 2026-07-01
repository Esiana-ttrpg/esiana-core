import { normalizePersistedTemplateType } from '../../../shared/wikiTemplateType.js';

/**
 * Maps Obsidian import folder modules to wiki template types and entity categories.
 * Entity modules resolve to DEFAULT; structural modules keep structural template types.
 */
const MODULE_TEMPLATE_TYPE: Record<string, string> = {
  'Game/Session Notes': 'SESSION_NOTE',
  'Game/Journals': 'JOURNAL',
  'Game/Quests': 'QUEST',
};

const MODULE_ENTITY_CATEGORY: Record<string, string> = {
  Characters: 'characters',
  Locations: 'locations',
  Organizations: 'organizations',
  'Families (tree)': 'families',
  Families: 'families',
  Bestiary: 'bestiary',
  Ancestries: 'ancestries',
  Objects: 'objects',
  Maps: 'maps',
  'Game/Rules & Resources': 'rules-resources',
  'Game/Journals': 'journals',
  'Game/Quests': 'quests',
};

export function resolveImportTemplateType(
  module: string,
  customFields?: Record<string, string>,
): string {
  const fromFrontMatter =
    customFields?.templateType?.trim() || customFields?.template?.trim();
  if (fromFrontMatter) {
    return normalizePersistedTemplateType(fromFrontMatter);
  }
  return MODULE_TEMPLATE_TYPE[module] ?? 'DEFAULT';
}

export function resolveImportEntityCategory(
  module: string,
  customFields?: Record<string, string>,
): string | undefined {
  const fromFrontMatter = customFields?.entityCategory?.trim();
  if (fromFrontMatter) return fromFrontMatter;
  return MODULE_ENTITY_CATEGORY[module];
}
