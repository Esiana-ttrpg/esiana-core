import { META_FIELD_LABEL_CLASS, META_TABLE_HEAD_CLASS } from '@/lib/surfaceLayout';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { controlClasses } from '@/components/admin/adminFormStyles';
import { PluginAdminStatusBadge } from '@/components/admin/plugins/PluginAdminStatusBadge';
import {
  buildInstalledPluginRows,
  deriveListStatus,
  formatArtifactVersion,
  formatLastVerifiedDisplay,
  scopeLabel,
  type InstalledPluginAdminRow,
} from '@/lib/pluginAdminPresentation';
import type {
  CampaignPluginCapabilityRecord,
  SystemPluginRecord,
} from '@/types/admin';

export function PluginInstalledTable({
  plugins,
  campaignCapabilities,
  togglingId,
  onInspect,
  onToggleEnabled,
}: {
  plugins: SystemPluginRecord[];
  campaignCapabilities: CampaignPluginCapabilityRecord[];
  togglingId: string | null;
  onInspect: (row: InstalledPluginAdminRow) => void;
  onToggleEnabled: (row: InstalledPluginAdminRow, enabled: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'campaign'>('all');

  const rows = useMemo(
    () => buildInstalledPluginRows(plugins, campaignCapabilities),
    [plugins, campaignCapabilities],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (scopeFilter !== 'all' && row.scope !== scopeFilter) return false;
      if (!query) return true;
      const haystack = `${row.name} ${row.id}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, scopeFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Search installed
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plugin name…"
              className={`${controlClasses} pl-9`}
            />
          </div>
        </label>
        <label className="w-full sm:w-44">
          <span className={META_FIELD_LABEL_CLASS}>
            Scope
          </span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
            className={controlClasses}
          >
            <option value="all">All</option>
            <option value="global">Global</option>
            <option value="campaign">Campaign</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface/60">
            <tr>
              <th className={`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`}>
                Name
              </th>
              <th className={`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`}>
                Scope
              </th>
              <th className={`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`}>
                Status
              </th>
              <th className={`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`}>
                Version
              </th>
              <th className={`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`}>
                Last verified
              </th>
              <th className={`px-4 py-3 text-right ${META_TABLE_HEAD_CLASS}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background/40">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {rows.length === 0
                    ? 'No plugins installed on this server yet.'
                    : 'No installed plugins match this filter.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const status = deriveListStatus(row);
                const statusTooltip =
                  status === 'quarantined' && row.quarantineReason
                    ? row.quarantineReason
                    : undefined;

                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-surface/40"
                    onClick={() => onInspect(row)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {scopeLabel(row.scope)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PluginAdminStatusBadge status={status} tooltip={statusTooltip} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                      {formatArtifactVersion(row.version)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatLastVerifiedDisplay(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div
                        className="inline-flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {row.isGlobal ? (
                          <button
                            type="button"
                            disabled={togglingId === row.id}
                            onClick={() => onToggleEnabled(row, !row.isEnabled)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-60"
                          >
                            {togglingId === row.id
                              ? 'Saving…'
                              : row.isEnabled
                                ? 'Disable'
                                : 'Enable'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onInspect(row)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
