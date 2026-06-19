import {
  isRegistryEntryInstallable,
  PLUGIN_CATEGORY_LABELS,
  PluginScopes,
  type PluginCategory,
  type PluginRegistryEntry,
  type PluginScope,
} from '@/lib/pluginManifest';

export type RegistrySortOption = 'name' | 'lastUpdated' | 'version';

export type DiscoveryListStatus = 'installed' | 'available' | 'catalogOnly';

export function deriveDiscoveryStatus(
  entry: PluginRegistryEntry,
  installed: boolean,
): DiscoveryListStatus {
  if (installed) return 'installed';
  if (isRegistryEntryInstallable(entry)) return 'available';
  return 'catalogOnly';
}

export function formatRegistryEntrySource(
  source?: { type?: string; repo?: string; commitSha?: string } | null,
): string | null {
  if (source?.type !== 'github' || !source.repo) return null;
  const sha = source.commitSha?.trim() ?? '';
  const pinned = /^[0-9a-f]{40}$/i.test(sha);
  return pinned ? `${source.repo} @ ${sha.slice(0, 12)}` : source.repo;
}

export function resolveRegistryTags(entry: PluginRegistryEntry): string[] {
  if (entry.tags?.length) return entry.tags.slice(0, 5);
  if (entry.category) return [PLUGIN_CATEGORY_LABELS[entry.category]];
  return [];
}

export function formatCatalogSyncedAgo(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'never';
  const syncedMs = Date.parse(lastSyncedAt);
  if (Number.isNaN(syncedMs)) return 'unknown';
  const diffMs = Date.now() - syncedMs;
  if (diffMs < 60_000) return 'just now';
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function buildRegistrySearchText(entry: PluginRegistryEntry): string {
  const parts = [
    entry.name,
    entry.description,
    ...resolveRegistryTags(entry),
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
    resolveRegistryTags(entry).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  );
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
    for (const tag of resolveRegistryTags(entry)) {
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
