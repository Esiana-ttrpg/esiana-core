import { useMemo, useState } from 'react';
import { CloudDownload, Package, Puzzle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ALL_PLUGIN_CATEGORIES,
  isRegistryEntryInstallable,
  PLUGIN_CATEGORY_LABELS,
  type PluginCategory,
  type PluginRegistryEntry,
} from '@/lib/pluginManifest';
import { PluginInstallConsent } from '@/components/admin/PluginInstallConsent';

function PluginCard({
  title,
  description,
  version,
  badge,
  categoryLabel,
  icon: Icon = Puzzle,
  children,
}: {
  title: string;
  description: string;
  version?: string;
  badge?: string;
  categoryLabel?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface/40 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-background/80 p-2 text-primary">
            <Icon className="size-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs text-muted">{description}</p>
            {version && (
              <p className="mt-1 text-[10px] font-mono text-muted">v{version}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {categoryLabel && (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
              {categoryLabel}
            </span>
          )}
          {badge && (
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
              {badge}
            </span>
          )}
        </div>
      </div>
      {children}
    </article>
  );
}

export function PluginDiscoveryGrid({
  entries,
  installedIds,
  installingId,
  onInstall,
  iconForEntry,
  title = 'Discoverable from registry',
}: {
  entries: PluginRegistryEntry[];
  installedIds: Set<string>;
  installingId: string | null;
  onInstall: (entry: PluginRegistryEntry) => void;
  iconForEntry?: (entryId: string) => LucideIcon;
  title?: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory | 'all'>('all');

  const filteredEntries = useMemo(() => {
    if (categoryFilter === 'all') return entries;
    return entries.filter((entry) => entry.category === categoryFilter);
  }, [categoryFilter, entries]);

  if (entries.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <CloudDownload className="size-4 text-primary" />
          {title}
        </h2>
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
            All
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
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredEntries.map((entry) => {
          const installed = installedIds.has(entry.id);
          const installable = isRegistryEntryInstallable(entry);
          const Icon = iconForEntry?.(entry.id) ?? Package;
          return (
            <PluginCard
              key={entry.id}
              title={entry.name}
              description={entry.description}
              version={entry.version}
              badge={
                installed
                  ? 'Installed'
                  : entry.source?.type === 'bundled'
                    ? 'Bundled'
                    : installable
                      ? 'Available'
                      : 'Catalog only'
              }
              categoryLabel={
                entry.category ? PLUGIN_CATEGORY_LABELS[entry.category] : undefined
              }
              icon={Icon}
            >
              {entry.source?.type === 'github' && entry.source.commitSha ? (
                <p className="mb-2 font-mono text-[10px] text-muted">
                  sha {entry.source.commitSha.slice(0, 7)}
                </p>
              ) : null}
              <PluginInstallConsent entry={entry} />
              <button
                type="button"
                disabled={installed || !installable || installingId === entry.id}
                onClick={() => onInstall(entry)}
                className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-elevated disabled:opacity-50"
              >
                {installed
                  ? 'Already installed'
                  : !installable
                    ? 'Not installable'
                    : installingId === entry.id
                      ? 'Installing…'
                      : 'Install'}
              </button>
            </PluginCard>
          );
        })}
      </div>
      {filteredEntries.length === 0 && (
        <p className="text-sm text-muted">No registry entries match this category filter.</p>
      )}
    </section>
  );
}
