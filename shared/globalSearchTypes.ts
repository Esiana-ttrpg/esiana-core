/**
 * Canonical global-search type keys, user-facing labels, and the operator
 * alias tables shared by the query parser (client + server).
 *
 * Icons stay server-side in backend/src/lib/search/searchTypes.ts.
 */

export interface GlobalSearchTypeDescriptor {
  key: string;
  label: string;
}

/** Wiki-backed entity types, keyed by resolveWikiCodexType outcome. */
export const GLOBAL_SEARCH_CODEX_TYPES: Readonly<
  Record<string, GlobalSearchTypeDescriptor>
> = Object.freeze({
  CHARACTER: { key: 'character', label: 'Character' },
  LOCATION: { key: 'location', label: 'Location' },
  ORGANIZATION: { key: 'organization', label: 'Organization' },
  FAMILY: { key: 'family', label: 'Family' },
  BESTIARY: { key: 'bestiary', label: 'Bestiary' },
  QUEST: { key: 'quest', label: 'Quest' },
  OBJECT: { key: 'object', label: 'Object' },
  ANCESTRY: { key: 'ancestry', label: 'Ancestry' },
  LANGUAGE: { key: 'language', label: 'Language' },
  RULE_RESOURCE: { key: 'rule-resource', label: 'Rule' },
  THREAD: { key: 'thread', label: 'Thread' },
  SESSION_NOTE: { key: 'session-note', label: 'Session Note' },
  SCENE: { key: 'scene', label: 'Scene' },
  OBJECTIVE: { key: 'objective', label: 'Objective' },
  ARC: { key: 'arc', label: 'Arc' },
  JOURNAL: { key: 'journal', label: 'Journal' },
  DOWNTIME_HAVEN: { key: 'haven', label: 'Haven' },
  DOWNTIME_PROJECT: { key: 'project', label: 'Project' },
  DEFAULT: { key: 'page', label: 'Wiki Page' },
});

export const GLOBAL_SEARCH_WIKI_TYPE_KEYS: readonly string[] = Object.freeze([
  ...new Set(Object.values(GLOBAL_SEARCH_CODEX_TYPES).map((d) => d.key)),
]);

const LABEL_BY_KEY: ReadonlyMap<string, string> = new Map(
  Object.values(GLOBAL_SEARCH_CODEX_TYPES).map((d) => [d.key, d.label]),
);

/** Prefix used by plugin-contributed search types: `plugin:<pluginId>:<collectionId>`. */
export const GLOBAL_SEARCH_PLUGIN_TYPE_PREFIX = 'plugin:';

export function isPluginSearchTypeKey(key: string): boolean {
  return key.startsWith(GLOBAL_SEARCH_PLUGIN_TYPE_PREFIX);
}

/**
 * Explicit, unambiguous aliases accepted by `type:`. Values are canonical keys.
 * Plural/singular module names only — no fuzzy inference.
 */
const TYPE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  character: 'character',
  characters: 'character',
  location: 'location',
  locations: 'location',
  place: 'location',
  places: 'location',
  organization: 'organization',
  organizations: 'organization',
  org: 'organization',
  orgs: 'organization',
  faction: 'organization',
  factions: 'organization',
  family: 'family',
  families: 'family',
  bestiary: 'bestiary',
  creature: 'bestiary',
  creatures: 'bestiary',
  monster: 'bestiary',
  monsters: 'bestiary',
  quest: 'quest',
  quests: 'quest',
  object: 'object',
  objects: 'object',
  item: 'object',
  items: 'object',
  ancestry: 'ancestry',
  ancestries: 'ancestry',
  language: 'language',
  languages: 'language',
  'rule-resource': 'rule-resource',
  rule: 'rule-resource',
  rules: 'rule-resource',
  thread: 'thread',
  threads: 'thread',
  'session-note': 'session-note',
  'session-notes': 'session-note',
  session: 'session-note',
  sessions: 'session-note',
  scene: 'scene',
  scenes: 'scene',
  objective: 'objective',
  objectives: 'objective',
  arc: 'arc',
  arcs: 'arc',
  journal: 'journal',
  journals: 'journal',
  haven: 'haven',
  havens: 'haven',
  project: 'project',
  projects: 'project',
  page: 'page',
  pages: 'page',
});

/**
 * `in:` scopes are named after user-facing Esiana modules/surfaces.
 * Each resolves to one or more canonical type keys. Implementation-only
 * groupings (e.g. "wiki", "plugins") are intentionally absent.
 */
const IN_SCOPES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  sessions: ['session-note'],
  'session-notes': ['session-note'],
  characters: ['character'],
  locations: ['location'],
  organizations: ['organization'],
  factions: ['organization'],
  families: ['family'],
  bestiary: ['bestiary'],
  quests: ['quest'],
  objects: ['object'],
  items: ['object'],
  threads: ['thread'],
  scenes: ['scene'],
  arcs: ['arc'],
  journals: ['journal'],
  pages: ['page'],
  rules: ['rule-resource'],
});

export function resolveTypeAlias(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (isPluginSearchTypeKey(normalized)) return normalized;
  return TYPE_ALIASES[normalized] ?? null;
}

export function resolveInScope(raw: string): readonly string[] | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  const scope = IN_SCOPES[normalized];
  if (scope) return scope;
  const single = resolveTypeAlias(normalized);
  return single ? [single] : null;
}

export function globalSearchTypeLabel(key: string): string {
  return LABEL_BY_KEY.get(key) ?? key;
}

/** Suggestion surface for `type:` autocomplete — canonical keys with labels. */
export function listTypeSuggestions(): GlobalSearchTypeDescriptor[] {
  return GLOBAL_SEARCH_WIKI_TYPE_KEYS.map((key) => ({
    key,
    label: globalSearchTypeLabel(key),
  }));
}

/** Suggestion surface for `in:` autocomplete — scope names with labels. */
export function listInScopeSuggestions(): Array<{
  scope: string;
  label: string;
  types: readonly string[];
}> {
  const preferred = [
    'sessions',
    'characters',
    'locations',
    'organizations',
    'families',
    'bestiary',
    'quests',
    'objects',
    'threads',
    'scenes',
    'arcs',
    'journals',
    'rules',
    'pages',
  ];
  return preferred.map((scope) => {
    const types = IN_SCOPES[scope]!;
    return {
      scope,
      label: scope.charAt(0).toUpperCase() + scope.slice(1),
      types,
    };
  });
}
