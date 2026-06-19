import { RefreshCw, X } from 'lucide-react';
import { FieldLabel } from '@/components/admin/AdminSectionCard';
import { controlClasses } from '@/components/admin/adminFormStyles';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { DEFAULT_PLUGIN_REGISTRY_URL } from '@/lib/pluginManifest';
import { formatCatalogSyncedAgo } from '@/lib/pluginRegistrySearch';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-xs text-muted sm:w-36">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function PluginSourcesDrawer({
  open,
  onClose,
  registryUrl,
  onRegistryUrlChange,
  syncingRegistry,
  onSync,
  lastSyncedAt,
  registryError,
  registryWarnings,
  catalogEntryCount,
}: {
  open: boolean;
  onClose: () => void;
  registryUrl: string;
  onRegistryUrlChange: (url: string) => void;
  syncingRegistry: boolean;
  onSync: () => void;
  lastSyncedAt: string | null;
  registryError: string | null;
  registryWarnings: string[];
  catalogEntryCount: number;
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  const registryReachable = lastSyncedAt !== null && !registryError;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Close plugin sources"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-xl"
        role="dialog"
        aria-label="Plugin sources"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Plugin sources</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface/80 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Registry source
            </h3>
            <div>
              <FieldLabel>Registry index URL</FieldLabel>
              <input
                type="url"
                value={registryUrl}
                onChange={(e) => onRegistryUrlChange(e.target.value)}
                placeholder={DEFAULT_PLUGIN_REGISTRY_URL}
                className={controlClasses}
              />
            </div>
            <p className="text-xs text-muted">
              Last synced: {formatCatalogSyncedAgo(lastSyncedAt)}
            </p>
            <button
              type="button"
              onClick={onSync}
              disabled={syncingRegistry}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${syncingRegistry ? 'animate-spin' : ''}`} />
              Sync now
            </button>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Diagnostics
            </h3>
            <dl className="space-y-2">
              <DetailRow
                label="Registry reachable"
                value={lastSyncedAt === null ? 'Not synced yet' : registryReachable ? 'Yes' : 'No'}
              />
              <DetailRow label="Catalog entries" value={String(catalogEntryCount)} />
              {registryError ? (
                <DetailRow label="Last error" value={registryError} />
              ) : null}
              {registryWarnings.length > 0 ? (
                <DetailRow label="Warnings" value={registryWarnings.join(' ')} />
              ) : null}
            </dl>
          </section>
        </div>
      </aside>
    </>
  );
}
