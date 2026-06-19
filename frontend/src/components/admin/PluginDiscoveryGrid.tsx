import { useMemo, useState } from 'react';
import { CloudDownload, Search } from 'lucide-react';
import { controlClasses } from '@/components/admin/adminFormStyles';
import {
  ALL_PLUGIN_CATEGORIES,
  isRegistryEntryInstallable,
  PLUGIN_CATEGORY_LABELS,
  PluginScopes,
  type PluginCategory,
  type PluginRegistryEntry,
  type PluginScope,
} from '@/lib/pluginManifest';
import {
  collectRegistryTags,
  compareRegistryEntries,
  formatRegistryLastUpdated,
  formatRegistryVerifiedCore,
  matchesRegistryCategoryFilter,
  matchesRegistryScopeFilter,
  matchesRegistrySearch,
  matchesRegistryTagFilter,
  type RegistrySortOption,
} from '@/lib/pluginRegistrySearch';
import { PluginInstallConsent } from '@/components/admin/PluginInstallConsent';

function scopeBadgeLabel(scope: PluginScope): string {
  return scope === PluginScopes.GLOBAL ? 'Global' : 'Campaign';
}

function PluginCard({
  entry,
  installed,
  installable,
  installing,
  onInstall,
}: {
  entry: PluginRegistryEntry;
  installed: boolean;
  installable: boolean;
  installing: boolean;
  onInstall: () => void;
}) {
  const categoryLabel = entry.category ? PLUGIN_CATEGORY_LABELS[entry.category] : null;
  const displayTags = (entry.tags ?? []).slice(0, 5);
  const verifiedCore = formatRegistryVerifiedCore(entry);

  const badge = installed
    ? 'Installed'
    : entry.source?.type === 'bundled'
      ? 'Bundled'
      : installable
        ? 'Available'
        : 'Catalog only';

  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface/40 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{entry.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{entry.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
          {badge}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {categoryLabel ? (
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            {categoryLabel}
          </span>
        ) : null}
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
          {scopeBadgeLabel(entry.scope)}
        </span>
        {displayTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mb-1 text-xs text-muted">
        Last updated {formatRegistryLastUpdated(entry)}
      </p>
      {verifiedCore ? (
        <p className="mb-3 text-xs text-muted">{verifiedCore}</p>
      ) : (
        <div className="mb-3" />
      )}

      <PluginInstallConsent entry={entry} />
      <button
        type="button"
        disabled={installed || !installable || installing}
        onClick={onInstall}
        className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-elevated disabled:opacity-50"
      >
        {installed
          ? 'Already installed'
          : !installable
            ? 'Not installable'
            : installing
              ? 'Installing…'
              : 'Install'}
      </button>
    </article>
  );
}

export function PluginDiscoveryGrid({
  entries,
  installedIds,
  installingId,
  onInstall,
  title = 'Discoverable from registry',
}: {
  entries: PluginRegistryEntry[];
  installedIds: Set<string>;
  installingId: string | null;
  onInstall: (entry: PluginRegistryEntry) => void;
  title?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<PluginScope | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<RegistrySortOption>('name');

  const availableTags = useMemo(() => collectRegistryTags(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter(
      (entry) =>
        matchesRegistrySearch(searchQuery, entry) &&
        matchesRegistryCategoryFilter(categoryFilter, entry) &&
        matchesRegistryScopeFilter(scopeFilter, entry) &&
        matchesRegistryTagFilter(tagFilter, entry),
    );
    return [...filtered].sort((a, b) => compareRegistryEntries(a, b, sort));
  }, [entries, searchQuery, categoryFilter, scopeFilter, tagFilter, sort]);

  function toggleTagFilter(tag: string) {
    setTagFilter((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  if (entries.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
        <CloudDownload className="size-4 text-primary" />
        {title}
      </h2>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Search catalog
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, description, tags, scope…"
              className={`${controlClasses} pl-9`}
            />
          </div>
        </label>
        <label className="w-full lg:w-44">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Scope
          </span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as PluginScope | 'all')}
            className={controlClasses}
          >
            <option value="all">All scopes</option>
            <option value={PluginScopes.GLOBAL}>Global</option>
            <option value={PluginScopes.CAMPAIGN}>Campaign</option>
          </select>
        </label>
        <label className="w-full lg:w-44">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as RegistrySortOption)}
            className={controlClasses}
          >
            <option value="name">Name (A–Z)</option>
            <option value="lastUpdated">Recently updated</option>
            <option value="version">Newest version</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            categoryFilter === 'all'
              ? 'bg-primary text-background'
              : 'border border-border text-muted hover:text-foreground'
          }`}
        >
          All types
        </button>
        {ALL_PLUGIN_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              categoryFilter === category
                ? 'bg-primary text-background'
                : 'border border-border text-muted hover:text-foreground'
            }`}
          >
            {PLUGIN_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {availableTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTagFilter(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tagFilter.includes(tag)
                  ? 'bg-primary text-background'
                  : 'border border-border text-muted hover:text-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredEntries.map((entry) => {
          const installed = installedIds.has(entry.id);
          const installable = isRegistryEntryInstallable(entry);
          return (
            <PluginCard
              key={entry.id}
              entry={entry}
              installed={installed}
              installable={installable}
              installing={installingId === entry.id}
              onInstall={() => onInstall(entry)}
            />
          );
        })}
      </div>

      {filteredEntries.length === 0 ? (
        <p className="text-sm text-muted">No registry entries match the current filters.</p>
      ) : null}
    </section>
  );
}
