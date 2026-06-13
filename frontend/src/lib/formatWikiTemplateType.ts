const WIKI_TEMPLATE_TYPE_LABELS: Record<string, string> = {
  DEFAULT: 'Page',
  CHARACTER: 'Character',
  LOCATION: 'Location',
  ORGANIZATION: 'Organization',
  FAMILY: 'Family',
  BESTIARY: 'Creature',
  QUEST: 'Quest',
  SCENE: 'Scene',
  OBJECTIVE: 'Objective',
  OBJECT: 'Object',
  ANCESTRY: 'Ancestry',
  LANGUAGE: 'Language',
  RULE_RESOURCE: 'Rule',
};

/** Human-readable codex page type for tooltips and margin notes. */
export function formatWikiTemplateType(templateType: string | null | undefined): string {
  if (!templateType?.trim()) return 'Page';
  const key = templateType.trim().toUpperCase();
  if (WIKI_TEMPLATE_TYPE_LABELS[key]) return WIKI_TEMPLATE_TYPE_LABELS[key];
  return key
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
