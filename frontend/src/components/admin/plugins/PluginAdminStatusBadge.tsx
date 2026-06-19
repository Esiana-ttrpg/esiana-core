import type { PluginListStatus } from '@/lib/pluginAdminPresentation';

const STATUS_STYLES: Record<PluginListStatus, string> = {
  quarantined:
    'border border-amber-500/30 bg-amber-500/15 text-amber-300',
  enabled:
    'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  disabled: 'border border-border bg-elevated text-muted',
  installed: 'border border-border bg-elevated text-muted',
};

const STATUS_LABELS: Record<PluginListStatus, string> = {
  quarantined: 'Quarantined',
  enabled: 'Enabled',
  disabled: 'Disabled',
  installed: 'Installed',
};

export function PluginAdminStatusBadge({
  status,
  tooltip,
}: {
  status: PluginListStatus;
  tooltip?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}
      title={tooltip}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
