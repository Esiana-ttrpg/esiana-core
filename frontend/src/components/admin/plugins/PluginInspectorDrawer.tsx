import { FormEvent } from 'react';
import { X } from 'lucide-react';
import { ToggleRow } from '@/components/admin/AdminSectionCard';
import { PluginConfigForm } from '@/components/admin/PluginConfigForm';
import { PluginAdminStatusBadge } from '@/components/admin/plugins/PluginAdminStatusBadge';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  deriveListStatus,
  formatArtifactVersion,
  formatLastUpdatedDisplay,
  formatLastVerifiedDisplay,
  getGlobalPluginFromRow,
  isGlobalPluginRow,
  scopeLabel,
  type InstalledPluginAdminRow,
} from '@/lib/pluginAdminPresentation';
import { PLUGIN_CATEGORY_LABELS } from '@/lib/pluginManifest';
import type { SystemPluginRecord } from '@/types/admin';

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border pb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-xs text-muted sm:w-36">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function PluginInspectorDrawer({
  open,
  row,
  draftConfig,
  draftEnabled,
  draftTemplate,
  saving,
  saveError,
  saveMessage,
  enableError,
  onClose,
  onDraftEnabledChange,
  onDraftFieldChange,
  onSave,
}: {
  open: boolean;
  row: InstalledPluginAdminRow | null;
  draftConfig: Record<string, unknown>;
  draftEnabled: boolean;
  draftTemplate: SystemPluginRecord['configTemplate'];
  saving: boolean;
  saveError: string | null;
  saveMessage: string | null;
  enableError: string | null;
  onClose: () => void;
  onDraftEnabledChange: (enabled: boolean) => void;
  onDraftFieldChange: (key: string, value: string | boolean) => void;
  onSave: (event: FormEvent) => void;
}) {
  useBodyScrollLock(open);

  if (!open || !row) return null;

  const status = deriveListStatus(row);
  const globalPlugin = getGlobalPluginFromRow(row);
  const category =
    'category' in row.source && row.source.category
      ? PLUGIN_CATEGORY_LABELS[row.source.category]
      : null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Close plugin inspector"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-xl"
        role="dialog"
        aria-label="Plugin inspector"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{row.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PluginAdminStatusBadge status={status} />
              <span className="text-xs text-muted">{scopeLabel(row.scope)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface/80 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <InspectorSection title="History">
              <dl className="space-y-2">
                <DetailRow label="Artifact version" value={formatArtifactVersion(row.version)} />
                <DetailRow
                  label="Last updated"
                  value={formatLastUpdatedDisplay(row.lastUpdated)}
                />
                <DetailRow
                  label="Last verified"
                  value={formatLastVerifiedDisplay(row)}
                />
                {row.lastVerified && row.lastVerifiedCoreVersion ? (
                  <DetailRow
                    label="Verified core"
                    value={row.lastVerifiedCoreVersion}
                  />
                ) : null}
              </dl>
            </InspectorSection>

            <InspectorSection title="Manifest">
              <dl className="space-y-2">
                {'description' in row.source && row.source.description ? (
                  <DetailRow label="Description" value={row.source.description} />
                ) : null}
                {category ? <DetailRow label="Type" value={category} /> : null}
                {'permissions' in row.source &&
                row.source.permissions &&
                row.source.permissions.length > 0 ? (
                  <DetailRow label="Permissions" value={row.source.permissions.join(', ')} />
                ) : null}
                {'uiSlots' in row.source &&
                row.source.uiSlots &&
                row.source.uiSlots.length > 0 ? (
                  <DetailRow label="UI slots" value={row.source.uiSlots.join(', ')} />
                ) : null}
              </dl>
            </InspectorSection>

            {isGlobalPluginRow(row) && globalPlugin ? (
              <InspectorSection title="Configuration">
                <form onSubmit={onSave} className="space-y-4">
                  <ToggleRow
                    label="Enable plugin"
                    checked={draftEnabled}
                    onChange={onDraftEnabledChange}
                  />
                  <PluginConfigForm
                    template={draftTemplate}
                    config={draftConfig}
                    onChange={onDraftFieldChange}
                  />
                  {enableError ? (
                    <p className="text-sm text-red-300">{enableError}</p>
                  ) : null}
                  {saveError ? <p className="text-sm text-red-300">{saveError}</p> : null}
                  {saveMessage ? (
                    <p className="text-sm text-emerald-300">{saveMessage}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save configuration'}
                  </button>
                </form>
              </InspectorSection>
            ) : (
              <InspectorSection title="Campaign enablement">
                <p className="text-sm text-muted">
                  Enable and configure this plugin per campaign in Campaign Settings →
                  Integrations.
                </p>
              </InspectorSection>
            )}

            {row.runtimeStatus === 'quarantined' || globalPlugin?.recentErrors?.length ? (
              <InspectorSection title="Runtime health">
                {row.quarantineReason ? (
                  <p className="text-sm text-muted">{row.quarantineReason}</p>
                ) : null}
                {globalPlugin?.recentErrors && globalPlugin.recentErrors.length > 0 ? (
                  <ul className="space-y-1 font-mono text-[10px] text-muted">
                    {globalPlugin.recentErrors.map((error, index) => (
                      <li key={`${error.at}-${index}`}>
                        {error.at} — {error.entity}:{error.phase} — {error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </InspectorSection>
            ) : null}

            {globalPlugin &&
            (globalPlugin.trustedInstall ||
              globalPlugin.commitSha ||
              globalPlugin.manifestChecksum) ? (
              <InspectorSection title="Install provenance">
                <dl className="space-y-2 text-sm text-muted">
                  {globalPlugin.trustedInstall ? (
                    <DetailRow label="Trust" value="Trusted install (SHA-pinned or bundled)" />
                  ) : null}
                  {globalPlugin.commitSha ? (
                    <DetailRow label="Commit" value={globalPlugin.commitSha.slice(0, 12)} />
                  ) : null}
                  {globalPlugin.manifestChecksum ? (
                    <DetailRow
                      label="Manifest"
                      value={`${globalPlugin.manifestChecksum.slice(0, 16)}…`}
                    />
                  ) : null}
                </dl>
              </InspectorSection>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
