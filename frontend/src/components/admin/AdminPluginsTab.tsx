import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Boxes,
  Link2,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiError } from '@/lib/api';
import {
  fetchAdminPlugins,
  fetchPluginRegistry,
  installPluginFromLink,
  installPluginFromRegistry,
  saveAdminPluginConfig,
} from '@/lib/adminPlugins';
import { fetchAdminSettings, updateAdminSettings } from '@/lib/adminSettings';
import {
  DEFAULT_PLUGIN_REGISTRY_URL,
  isRegistryEntryInstallable,
  PluginScopes,
  type PluginRegistryEntry,
} from '@/lib/pluginManifest';
import type { CampaignPluginCapabilityRecord, SystemPluginRecord } from '@/types/admin';
import { ToggleRow } from '@/components/admin/AdminSectionCard';
import { PluginConfigForm } from '@/components/admin/PluginConfigForm';
import { mergePluginConfigFields } from '@/lib/configSchemaParser';
import { PluginDiscoveryGrid } from '@/components/admin/PluginDiscoveryGrid';
import { PluginRegistrySyncSection } from '@/components/admin/PluginRegistrySyncSection';
import { FieldLabel } from '@/components/admin/AdminSectionCard';
import { controlClasses } from '@/components/admin/adminFormStyles';

function pluginIcon(_id: string): LucideIcon {
  return Package;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}

export function AdminPluginsTab() {
  const [plugins, setPlugins] = useState<SystemPluginRecord[]>([]);
  const [campaignCapabilities, setCampaignCapabilities] = useState<
    CampaignPluginCapabilityRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [registryUrl, setRegistryUrl] = useState(DEFAULT_PLUGIN_REGISTRY_URL);
  const [syncingRegistry, setSyncingRegistry] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [registryWarnings, setRegistryWarnings] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<PluginRegistryEntry[]>([]);

  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestMessage, setManifestMessage] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [manifestLinkUrl, setManifestLinkUrl] = useState('');
  const [installingFromLink, setInstallingFromLink] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({});
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState<SystemPluginRecord['configTemplate']>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const refreshPlugins = useCallback(async () => {
    const response = await fetchAdminPlugins();
    setPlugins(response.plugins);
    setCampaignCapabilities(response.campaignCapabilities);
    return response;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([fetchAdminPlugins(), fetchAdminSettings()])
      .then(([pluginResponse, settings]) => {
        if (cancelled) return;
        setPlugins(pluginResponse.plugins);
        setCampaignCapabilities(pluginResponse.campaignCapabilities);
        setRegistryUrl(settings.plugins?.registryUrl ?? DEFAULT_PLUGIN_REGISTRY_URL);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load system plugins.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function persistRegistryUrl(url: string) {
    await updateAdminSettings({
      plugins: { registryUrl: url },
    });
  }

  async function handleSyncRegistry() {
    setSyncingRegistry(true);
    setRegistryError(null);
    setRegistryWarnings([]);

    const url = registryUrl.trim() || DEFAULT_PLUGIN_REGISTRY_URL;

    try {
      await persistRegistryUrl(url);

      const response = await fetchPluginRegistry();
      setRegistryUrl(response.registryUrl);
      setDiscovered(response.plugins);
      const warnings = [...(response.warnings ?? [])];
      if (response.plugins.length === 0) {
        warnings.push('Registry loaded but contains no plugin entries.');
      }
      setRegistryWarnings(warnings);
    } catch (err) {
      setRegistryError(
        err instanceof Error
          ? err.message
          : 'Unable to sync plugin registry. Check the URL and try again.',
      );
      setDiscovered([]);
    } finally {
      setSyncingRegistry(false);
    }
  }

  async function handleInstallRegistryEntry(entry: PluginRegistryEntry) {
    if (!isRegistryEntryInstallable(entry)) {
      setManifestError(
        'This catalog entry is browse-only. It has no pinned GitHub commit source.',
      );
      return;
    }

    setInstallingId(entry.id);
    setManifestError(null);
    setManifestMessage(null);

    try {
      const result = await installPluginFromRegistry(entry);
      await refreshPlugins();
      setManifestMessage(
        `Installed ${result.plugin.name} (${result.plugin.id}) at commit ${result.install.commitSha.slice(0, 7)}.`,
      );
      setDiscovered((prev) => prev.filter((p) => p.id !== entry.id));
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setManifestError(err.details.join(' '));
      } else {
        setManifestError(
          err instanceof Error ? err.message : 'Unable to install plugin from registry.',
        );
      }
    } finally {
      setInstallingId(null);
    }
  }

  async function handleInstallFromLink() {
    const url = manifestLinkUrl.trim();
    if (!url) {
      setManifestError('Enter a secure https:// or http:// manifest URL.');
      return;
    }

    setInstallingFromLink(true);
    setManifestError(null);
    setManifestMessage(null);

    try {
      const plugin = await installPluginFromLink(url);
      await refreshPlugins();
      setManifestMessage(`Installed ${plugin.name} (${plugin.id}) from remote manifest.`);
      setManifestLinkUrl('');
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setManifestError(err.details.join(' '));
      } else {
        setManifestError(
          err instanceof Error
            ? err.message
            : 'Unable to install plugin from manifest link.',
        );
      }
    } finally {
      setInstallingFromLink(false);
    }
  }

  function openConfigure(plugin: SystemPluginRecord) {
    setExpandedId(plugin.id);
    setDraftConfig({ ...plugin.config });
    setDraftEnabled(plugin.isEnabled);
    setDraftTemplate(
      mergePluginConfigFields({
        configTemplate: plugin.configTemplate,
        configSchema: plugin.configSchema,
      }),
    );
    setSaveError(null);
    setSaveMessage(null);
  }

  function closeConfigure() {
    setExpandedId(null);
    setDraftConfig({});
    setDraftTemplate([]);
  }

  function setDraftField(key: string, value: string | boolean) {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSavePlugin(event: FormEvent, pluginId: string) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const updated = await saveAdminPluginConfig(pluginId, {
        config: draftConfig,
        isEnabled: draftEnabled,
      });
      setPlugins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSaveMessage(`${updated.name} configuration saved.`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to save plugin configuration.',
      );
    } finally {
      setSaving(false);
    }
  }

  const globalPlugins = plugins.filter((p) => p.scope === PluginScopes.GLOBAL);
  const installedIds = new Set([
    ...globalPlugins.map((p) => p.id),
    ...campaignCapabilities.map((p) => p.id),
  ]);

  if (loading) {
    return <LoadingSpinner label="Loading system plugins…" />;
  }

  if (loadError) {
    return <ErrorBanner message={loadError} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-muted">
        <Boxes className="size-5 text-primary" />
        <p className="text-sm">
          Discover extensions from a remote registry or install manifests directly.
        </p>
      </div>

      {(manifestError || registryError) && (
        <ErrorBanner message={manifestError ?? registryError ?? ''} />
      )}
      {manifestMessage && (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {manifestMessage}
        </p>
      )}

      <PluginRegistrySyncSection
        registryUrl={registryUrl}
        onRegistryUrlChange={setRegistryUrl}
        showRegistryUrlEditor
        syncingRegistry={syncingRegistry}
        onSync={() => void handleSyncRegistry()}
        registryWarnings={registryWarnings}
      />

      <section className="space-y-3 rounded-xl border border-border bg-surface/40 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <Link2 className="size-4 text-primary" />
          Direct Manifest Link Installation
        </h2>
        <p className="text-xs text-muted">
          Paste a raw JSON manifest URL (for example, a GitHub raw.githubusercontent.com
          link). The server fetches and validates the manifest securely.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel>Manifest URL</FieldLabel>
            <input
              type="url"
              value={manifestLinkUrl}
              onChange={(e) => setManifestLinkUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/org/repo/main/plugin.json"
              className={controlClasses}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleInstallFromLink()}
            disabled={installingFromLink}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
          >
            {installingFromLink ? 'Installing…' : 'Install Plugin'}
          </button>
        </div>
      </section>

      <PluginDiscoveryGrid
        entries={discovered}
        installedIds={installedIds}
        installingId={installingId}
        onInstall={(entry) => void handleInstallRegistryEntry(entry)}
        iconForEntry={pluginIcon}
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Installed plugins
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {globalPlugins.map((plugin) => {
            const Icon = pluginIcon(plugin.id);
            const isExpanded = expandedId === plugin.id;
            const description =
              plugin.description ||
              'Platform extension installed on this instance.';

            return (
              <article
                key={plugin.id}
                className={`flex flex-col rounded-xl border bg-surface/40 transition-colors ${
                  isExpanded
                    ? 'border-primary/40 ring-1 ring-primary/20 lg:col-span-2 xl:col-span-3'
                    : 'border-border'
                }`}
              >
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-border bg-background/80 p-2 text-primary">
                        <Icon className="size-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{plugin.name}</h3>
                        <p className="mt-0.5 text-xs text-muted">{description}</p>
                        {plugin.version && (
                          <p className="mt-1 font-mono text-[10px] text-muted">
                            v{plugin.version}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        plugin.runtimeStatus === 'quarantined'
                          ? 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
                          : plugin.isEnabled
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                            : 'border border-border bg-elevated text-muted'
                      }`}
                    >
                      {plugin.runtimeStatus === 'quarantined'
                        ? 'Quarantined'
                        : plugin.isEnabled
                          ? 'Enabled'
                          : 'Disabled'}
                    </span>
                  </div>
                  {plugin.runtimeStatus === 'quarantined' && plugin.quarantineReason ? (
                    <p className="mb-3 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                      Hook quarantine: {plugin.quarantineReason}
                    </p>
                  ) : null}
                  {plugin.permissions && plugin.permissions.length > 0 ? (
                    <p className="mb-2 font-mono text-[10px] text-muted">
                      {plugin.permissions.join(' · ')}
                    </p>
                  ) : null}
                  {!isExpanded && (
                    <button
                      type="button"
                      onClick={() => openConfigure(plugin)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-elevated"
                    >
                      Configure
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <form
                    onSubmit={(e) => handleSavePlugin(e, plugin.id)}
                    className="space-y-4 border-t border-border bg-background/50 p-5"
                  >
                    <ToggleRow
                      label="Enable plugin"
                      checked={draftEnabled}
                      onChange={setDraftEnabled}
                    />
                    {draftTemplate.length > 0 ? (
                      <PluginConfigForm
                        template={draftTemplate}
                        config={draftConfig}
                        onChange={setDraftField}
                      />
                    ) : (
                      <PluginConfigForm
                        template={[]}
                        config={draftConfig}
                        onChange={setDraftField}
                      />
                    )}
                    {saveError && <p className="text-sm text-red-300">{saveError}</p>}
                    {saveMessage && (
                      <p className="text-sm text-emerald-300">{saveMessage}</p>
                    )}
                    {plugin.recentErrors && plugin.recentErrors.length > 0 ? (
                      <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
                        <p className="mb-1 font-medium text-foreground">Recent hook errors</p>
                        <ul className="space-y-1 font-mono text-[10px] text-muted">
                          {plugin.recentErrors.map((error, index) => (
                            <li key={`${error.at}-${index}`}>
                              {error.at} — {error.entity}:{error.phase} — {error.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {(plugin.manifestChecksum || plugin.commitSha || plugin.trustedInstall) ? (
                      <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted">
                        <p className="mb-1 font-medium text-foreground">Install provenance</p>
                        {plugin.trustedInstall ? (
                          <p className="text-emerald-300">Trusted install (SHA-pinned or bundled)</p>
                        ) : null}
                        {plugin.commitSha ? (
                          <p className="font-mono text-[10px]">commit {plugin.commitSha.slice(0, 12)}</p>
                        ) : null}
                        {plugin.manifestChecksum ? (
                          <p className="font-mono text-[10px]">manifest {plugin.manifestChecksum.slice(0, 16)}…</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Save plugin'}
                      </button>
                      <button
                        type="button"
                        onClick={closeConfigure}
                        className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-elevated"
                      >
                        Close
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {campaignCapabilities.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Installed campaign capabilities
          </h2>
          <p className="text-xs text-muted">
            Campaign-scoped plugins installed on this server. Campaign admins enable and
            configure these per campaign in Campaign Settings.
          </p>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {campaignCapabilities.map((capability) => (
              <article
                key={capability.id}
                className="rounded-xl border border-border bg-surface/40 p-5"
              >
                <h3 className="font-semibold text-foreground">{capability.name}</h3>
                <p className="mt-1 text-xs text-muted">{capability.description}</p>
                {capability.version ? (
                  <p className="mt-2 font-mono text-[10px] text-muted">v{capability.version}</p>
                ) : null}
                <p className="mt-3 text-[10px] uppercase tracking-wider text-muted">
                  Per-campaign enablement
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
