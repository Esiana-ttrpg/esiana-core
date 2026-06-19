import type { DiscoveryListStatus } from '@/lib/pluginRegistrySearch';

const STATUS_STYLES: Record<DiscoveryListStatus, string> = {
  installed: 'border border-border bg-elevated text-muted',
  bundled: 'border border-violet-500/30 bg-violet-500/15 text-violet-300',
  available: 'border border-sky-500/30 bg-sky-500/15 text-sky-300',
  catalogOnly: 'border border-border bg-surface/60 text-muted',
};

const STATUS_LABELS: Record<DiscoveryListStatus, string> = {
  installed: 'Installed',
  bundled: 'Bundled',
  available: 'Available',
  catalogOnly: 'Catalog only',
};

export function PluginDiscoveryStatusBadge({ status }: { status: DiscoveryListStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
