/**
 * Canonical search type keys / labels / icons for wiki-backed entities.
 * Derived from resolveWikiCodexType outcomes so tabs stay provider-driven.
 */

export interface SearchTypeDescriptor {
  key: string;
  label: string;
  fallbackIcon: string;
}

const CODEX_TO_TYPE: Record<string, SearchTypeDescriptor> = {
  CHARACTER: { key: 'character', label: 'Character', fallbackIcon: 'user' },
  LOCATION: { key: 'location', label: 'Location', fallbackIcon: 'map-pin' },
  ORGANIZATION: {
    key: 'organization',
    label: 'Organization',
    fallbackIcon: 'building',
  },
  FAMILY: { key: 'family', label: 'Family', fallbackIcon: 'users' },
  BESTIARY: { key: 'bestiary', label: 'Bestiary', fallbackIcon: 'bug' },
  QUEST: { key: 'quest', label: 'Quest', fallbackIcon: 'scroll-text' },
  OBJECT: { key: 'object', label: 'Object', fallbackIcon: 'package' },
  ANCESTRY: { key: 'ancestry', label: 'Ancestry', fallbackIcon: 'users' },
  LANGUAGE: { key: 'language', label: 'Language', fallbackIcon: 'book-open' },
  RULE_RESOURCE: {
    key: 'rule-resource',
    label: 'Rule',
    fallbackIcon: 'book-open',
  },
  THREAD: { key: 'thread', label: 'Thread', fallbackIcon: 'git-branch' },
  SESSION_NOTE: {
    key: 'session-note',
    label: 'Session Note',
    fallbackIcon: 'notebook-pen',
  },
  SCENE: { key: 'scene', label: 'Scene', fallbackIcon: 'eye' },
  OBJECTIVE: { key: 'objective', label: 'Objective', fallbackIcon: 'target' },
  ARC: { key: 'arc', label: 'Arc', fallbackIcon: 'git-branch' },
  JOURNAL: { key: 'journal', label: 'Journal', fallbackIcon: 'notebook-pen' },
  DOWNTIME_HAVEN: {
    key: 'haven',
    label: 'Haven',
    fallbackIcon: 'home',
  },
  DOWNTIME_PROJECT: {
    key: 'project',
    label: 'Project',
    fallbackIcon: 'package',
  },
  DEFAULT: { key: 'page', label: 'Wiki Page', fallbackIcon: 'file-text' },
};

/** All type keys owned by the wiki page search provider. */
export const WIKI_SEARCH_TYPE_KEYS: readonly string[] = Object.freeze(
  [...new Set(Object.values(CODEX_TO_TYPE).map((d) => d.key))],
);

export function searchTypeFromCodexType(codexType: string): SearchTypeDescriptor {
  const key = codexType.trim().toUpperCase();
  return CODEX_TO_TYPE[key] ?? CODEX_TO_TYPE.DEFAULT!;
}

export function providerOwnsRequestedTypes(
  ownedKeys: readonly string[] | undefined,
  requested: string[] | null,
): boolean {
  if (requested == null || requested.length === 0) return true;
  if (!ownedKeys || ownedKeys.length === 0) return true;
  const owned = new Set(ownedKeys);
  return requested.some((k) => owned.has(k));
}
