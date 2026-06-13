import { RefreshCw } from 'lucide-react';
import { FieldLabel } from '@/components/admin/AdminSectionCard';
import { controlClasses } from '@/components/admin/adminFormStyles';
import { DEFAULT_PLUGIN_REGISTRY_URL } from '@/lib/pluginManifest';

export function PluginRegistrySyncSection({
  registryUrl,
  onRegistryUrlChange,
  showRegistryUrlEditor,
  registryUrlNote,
  syncingRegistry,
  onSync,
  registryWarnings,
}: {
  registryUrl: string;
  onRegistryUrlChange?: (url: string) => void;
  showRegistryUrlEditor: boolean;
  registryUrlNote?: string;
  syncingRegistry: boolean;
  onSync: () => void;
  registryWarnings: string[];
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface/40 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        Plugin registry
      </h2>
      {showRegistryUrlEditor ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel>Registry index URL</FieldLabel>
            <input
              type="url"
              value={registryUrl}
              onChange={(e) => onRegistryUrlChange?.(e.target.value)}
              placeholder={DEFAULT_PLUGIN_REGISTRY_URL}
              className={controlClasses}
            />
          </div>
          <button
            type="button"
            onClick={onSync}
            disabled={syncingRegistry}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${syncingRegistry ? 'animate-spin' : ''}`} />
            Sync Registry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {registryUrlNote && <p className="text-xs text-muted">{registryUrlNote}</p>}
          {registryUrl && (
            <p className="break-all font-mono text-[11px] text-muted">{registryUrl}</p>
          )}
          <button
            type="button"
            onClick={onSync}
            disabled={syncingRegistry}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${syncingRegistry ? 'animate-spin' : ''}`} />
            Sync Registry
          </button>
        </div>
      )}
      {registryWarnings.length > 0 && (
        <p className="text-xs text-primary/90">{registryWarnings.join(' ')}</p>
      )}
    </section>
  );
}
