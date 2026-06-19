import {
  PLUGIN_CATEGORY_LABELS,
  PluginScopes,
  type PluginCategory,
  type PluginRegistryEntry,
  type PluginScope,
} from '@/lib/pluginManifest';

export type RegistrySortOption = 'name' | 'lastUpdated' | 'version';

export function buildRegistrySearchText(entry: PluginRegistryEntry): string {
  const parts = [
    entry.name,
    entry.description,
    ...(entry.tags ?? []),
    entry.category ? PLUGIN_CATEGORY_LABELS[entry.category] : '',
    entry.scope === PluginScopes.GLOBAL ? 'global' : 'campaign',
  ];
  return parts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

export function matchesRegistrySearch(query: string, entry: PluginRegistryEntry): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const index = buildRegistrySearchText(entry);
  return normalized.split(/\s+/).every((token) => index.includes(token));
}

export function matchesRegistryScopeFilter(
  scopeFilter: PluginScope | 'all',
  entry: PluginRegistryEntry,
): boolean {
  if (scopeFilter === 'all') return true;
  return entry.scope === scopeFilter;
}

export function matchesRegistryCategoryFilter(
  categoryFilter: PluginCategory | 'all',
  entry: PluginRegistryEntry,
): boolean {
  if (categoryFilter === 'all') return true;
  return entry.category === categoryFilter;
}

export function matchesRegistryTagFilter(
  tagFilter: string[],
  entry: PluginRegistryEntry,
): boolean {
  if (tagFilter.length === 0) return true;
  const entryTags = new Set(
    (entry.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  );
  if (entryTags.size === 0 && entry.category) {
    entryTags.add(PLUGIN_CATEGORY_LABELS[entry.category].toLowerCase());
  }
  return tagFilter.every((tag) => entryTags.has(tag.trim().toLowerCase()));
}

function parseVersionParts(version: string): number[] {
  const match = version.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return [0];
  return [
    Number.parseInt(match[1] ?? '0', 10),
    Number.parseInt(match[2] ?? '0', 10),
    Number.parseInt(match[3] ?? '0', 10),
  ];
}

export function compareRegistryEntries(
  a: PluginRegistryEntry,
  b: PluginRegistryEntry,
  sort: RegistrySortOption,
): number {
  if (sort === 'name') {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  }
  if (sort === 'lastUpdated') {
    const aTime = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
    const bTime = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
    return bTime - aTime;
  }
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  for (let i = 0; i < 3; i++) {
    const diff = (bParts[i] ?? 0) - (aParts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function collectRegistryTags(entries: PluginRegistryEntry[]): string[] {
  const tags = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function formatRegistryLastUpdated(entry: PluginRegistryEntry): string {
  if (!entry.lastUpdated?.trim()) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
      new Date(entry.lastUpdated),
    );
  } catch {
    return '—';
  }
}

export function formatRegistryVerifiedCore(entry: PluginRegistryEntry): string | null {
  const core = entry.compatibility?.lastVerifiedCore?.trim();
  if (!core) return null;
  return `Verified on core ${core}`;
}
