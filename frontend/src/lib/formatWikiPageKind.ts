const WIKI_PAGE_KIND_LABELS: Record<string, string> = {
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
  JOURNAL: 'Journal',
  SESSION_NOTE: 'Session note',
};

/** Human-readable page kind for tooltips and margin notes. */
export function formatWikiPageKind(kind: string | null | undefined): string {
  if (!kind?.trim()) return 'Page';
  const key = kind.trim().toUpperCase();
  if (WIKI_PAGE_KIND_LABELS[key]) return WIKI_PAGE_KIND_LABELS[key];
  return key
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
