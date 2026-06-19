import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, RefreshCw, Search } from 'lucide-react';
import { controlClasses } from '@/components/admin/adminFormStyles';
import { PluginInstallConsent } from '@/components/admin/PluginInstallConsent';
import { PluginDiscoveryStatusBadge } from '@/components/admin/plugins/PluginDiscoveryStatusBadge';
import { formatArtifactVersion } from '@/lib/pluginAdminPresentation';
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
  deriveDiscoveryStatus,
  formatRegistryEntrySource,
  formatRegistryLastUpdated,
  formatRegistryVerifiedCore,
  matchesRegistryCategoryFilter,
  matchesRegistryScopeFilter,
  matchesRegistrySearch,
  matchesRegistryTagFilter,
  registryScopeLabel,
  resolveRegistryTags,
  type RegistrySortOption,
} from '@/lib/pluginRegistrySearch';

export function PluginDiscoveryTable({
  entries,
  installedIds,
  installingId,
  syncingRegistry,
  onInstall,
  onRefreshCatalog,
  onInstallFromUrl,
  onOpenPluginSources,
}: {
  entries: PluginRegistryEntry[];
  installedIds: Set<string>;
  installingId: string | null;
  syncingRegistry: boolean;
  onInstall: (entry: PluginRegistryEntry) => void;
  onRefreshCatalog: () => void;
  onInstallFromUrl: () => void;
  onOpenPluginSources: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<PluginScope | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<RegistrySortOption>('name');
  const [hideInstalled, setHideInstalled] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const availableTags = useMemo(() => collectRegistryTags(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter(
      (entry) =>
        (!hideInstalled || !installedIds.has(entry.id)) &&
        matchesRegistrySearch(searchQuery, entry) &&
        matchesRegistryCategoryFilter(categoryFilter, entry) &&
        matchesRegistryScopeFilter(scopeFilter, entry) &&
        matchesRegistryTagFilter(tagFilter, entry),
    );
    return [...filtered].sort((a, b) => compareRegistryEntries(a, b, sort));
  }, [
    entries,
    hideInstalled,
    installedIds,
    searchQuery,
    categoryFilter,
    scopeFilter,
    tagFilter,
    sort,
  ]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== 'all' ||
    scopeFilter !== 'all' ||
    tagFilter.length > 0;

  const allCatalogInstalled =
    entries.length > 0 && entries.every((entry) => installedIds.has(entry.id));

  const emptyTableMessage = hasActiveFilters
    ? 'No plugins match the current filters.'
    : hideInstalled && allCatalogInstalled
      ? 'All catalog plugins are already installed.'
      : 'No plugins were found in the catalog.';

  function toggleTagFilter(tag: string) {
    setTagFilter((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function toggleExpanded(entryId: string) {
    setExpandedId((current) => (current === entryId ? null : entryId));
  }

  if (entries.length === 0) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-surface/40 px-5 py-8 text-center">
          <p className="text-sm text-foreground">No plugins were found in the catalog.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenPluginSources}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-elevated"
            >
              Open Plugin Sources
            </button>
            <button
              type="button"
              onClick={onRefreshCatalog}
              disabled={syncingRegistry}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-elevated disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${syncingRegistry ? 'animate-spin' : ''}`} />
              Refresh Catalog
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
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
        <div className="flex flex-wrap gap-2 lg:pb-0.5">
          <button
            type="button"
            onClick={onRefreshCatalog}
            disabled={syncingRegistry}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${syncingRegistry ? 'animate-spin' : ''}`} />
            Refresh Catalog
          </button>
          <button
            type="button"
            onClick={onInstallFromUrl}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated"
          >
            Install from URL
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="w-full sm:w-44">
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
        <label className="w-full sm:w-44">
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
        <label className="inline-flex items-center gap-2 pb-0.5 sm:h-[42px]">
          <input
            type="checkbox"
            checked={hideInstalled}
            onChange={(e) => setHideInstalled(e.target.checked)}
            className="size-4 shrink-0 rounded border-border bg-background text-primary focus:ring-primary/40"
          />
          <span className="text-sm text-foreground">Hide Installed</span>
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Scope
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Last updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background/40">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {emptyTableMessage}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const installed = installedIds.has(entry.id);
                const installable = isRegistryEntryInstallable(entry);
                const status = deriveDiscoveryStatus(entry, installed);
                const verifiedCore = formatRegistryVerifiedCore(entry);
                const sourceLabel = formatRegistryEntrySource(entry.source);
                const displayTags = resolveRegistryTags(entry);
                const expanded = expandedId === entry.id;
                const installing = installingId === entry.id;

                return (
                  <Fragment key={entry.id}>
                    <tr
                      className="cursor-pointer hover:bg-surface/40"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <ChevronDown
                            className={`mt-0.5 size-4 shrink-0 text-muted transition-transform ${
                              expanded ? 'rotate-180' : ''
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{entry.name}</p>
                            {entry.description ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                                {entry.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {registryScopeLabel(entry.scope)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PluginDiscoveryStatusBadge status={status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                        {formatArtifactVersion(entry.version)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {formatRegistryLastUpdated(entry)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div
                          className="inline-flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpanded(entry.id)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated"
                          >
                            {expanded ? 'Hide' : 'Details'}
                          </button>
                          <button
                            type="button"
                            disabled={installed || !installable || installing}
                            onClick={() => onInstall(entry)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-50"
                          >
                            {installed
                              ? 'Installed'
                              : !installable
                                ? 'Not installable'
                                : installing
                                  ? 'Installing…'
                                  : 'Install'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-surface/20">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-3 pl-6">
                            {entry.description ? (
                              <p className="text-sm text-muted">{entry.description}</p>
                            ) : null}
                            {displayTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {displayTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {verifiedCore ? (
                              <p className="text-xs text-muted">{verifiedCore}</p>
                            ) : null}
                            {sourceLabel ? (
                              <p className="font-mono text-xs text-muted">
                                Source: {sourceLabel}
                              </p>
                            ) : null}
                            <PluginInstallConsent entry={entry} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredEntries.length === 0 && !hasActiveFilters && !allCatalogInstalled ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenPluginSources}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-elevated"
          >
            Open Plugin Sources
          </button>
          <button
            type="button"
            onClick={onRefreshCatalog}
            disabled={syncingRegistry}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-elevated disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${syncingRegistry ? 'animate-spin' : ''}`} />
            Refresh Catalog
          </button>
        </div>
      ) : null}
    </section>
  );
}
