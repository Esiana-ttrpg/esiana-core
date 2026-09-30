/**
 * Canonical search type keys / labels / icons for wiki-backed entities.
 * Keys and labels are shared; icons stay server-side.
 */

import {
  GLOBAL_SEARCH_CODEX_TYPES,
  GLOBAL_SEARCH_WIKI_TYPE_KEYS,
} from '../../../../shared/globalSearchTypes.js';

export interface SearchTypeDescriptor {
  key: string;
  label: string;
  fallbackIcon: string;
}

const CODEX_ICONS: Readonly<Record<string, string>> = Object.freeze({
  CHARACTER: 'user',
  LOCATION: 'map-pin',
  ORGANIZATION: 'building',
  FAMILY: 'users',
  BESTIARY: 'bug',
  QUEST: 'scroll-text',
  OBJECT: 'package',
  ANCESTRY: 'users',
  LANGUAGE: 'book-open',
  RULE_RESOURCE: 'book-open',
  THREAD: 'git-branch',
  SESSION_NOTE: 'notebook-pen',
  SCENE: 'eye',
  OBJECTIVE: 'target',
  ARC: 'git-branch',
  JOURNAL: 'notebook-pen',
  DOWNTIME_HAVEN: 'home',
  DOWNTIME_PROJECT: 'package',
  DEFAULT: 'file-text',
});

const CODEX_TO_TYPE: Record<string, SearchTypeDescriptor> = Object.fromEntries(
  Object.entries(GLOBAL_SEARCH_CODEX_TYPES).map(([codex, desc]) => [
    codex,
    {
      key: desc.key,
      label: desc.label,
      fallbackIcon: CODEX_ICONS[codex] ?? 'file-text',
    },
  ]),
);

/** All type keys owned by the wiki page search provider. */
export const WIKI_SEARCH_TYPE_KEYS: readonly string[] = GLOBAL_SEARCH_WIKI_TYPE_KEYS;

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
