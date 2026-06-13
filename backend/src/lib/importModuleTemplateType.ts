/**
 * Maps Obsidian import folder modules to wiki template types and entity categories.
 * Frontmatter `templateType` wins when present.
 */
const MODULE_TEMPLATE_TYPE: Record<string, string> = {
  Characters: 'CHARACTER',
  Locations: 'LOCATION',
  Organizations: 'ORGANIZATION',
  'Families (tree)': 'FAMILY',
  Families: 'FAMILY',
  'Game/Session Notes': 'SESSION_NOTE',
  'Game/Journals': 'JOURNAL',
  'Game/Quests': 'QUEST',
  Maps: 'DEFAULT',
  Objects: 'DEFAULT',
  Bestiary: 'DEFAULT',
  Ancestries: 'DEFAULT',
  'Game/Rules & Resources': 'DEFAULT',
  'Game/Calendars': 'DEFAULT',
  'Game/Timelines': 'DEFAULT',
  'Game/Events': 'DEFAULT',
  'Wiki/Generic': 'DEFAULT',
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
};

export function resolveImportTemplateType(
  module: string,
  customFields?: Record<string, string>,
): string {
  const fromFrontMatter =
    customFields?.templateType?.trim() || customFields?.template?.trim();
  if (fromFrontMatter) return fromFrontMatter;
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
