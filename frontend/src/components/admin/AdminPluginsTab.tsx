import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Boxes, Settings } from 'lucide-react';
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
import { mergePluginConfigFields } from '@/lib/configSchemaParser';
import { PluginDiscoveryGrid } from '@/components/admin/PluginDiscoveryGrid';
import {
  PluginAdminTabBar,
  type PluginAdminView,
} from '@/components/admin/plugins/PluginAdminTabBar';
import { PluginInstalledTable } from '@/components/admin/plugins/PluginInstalledTable';
import { PluginInspectorDrawer } from '@/components/admin/plugins/PluginInspectorDrawer';
import { PluginSourcesDrawer } from '@/components/admin/plugins/PluginSourcesDrawer';
import { InstallFromManifestModal } from '@/components/admin/plugins/InstallFromManifestModal';
import {
  getGlobalPluginFromRow,
  type InstalledPluginAdminRow,
} from '@/lib/pluginAdminPresentation';
import { formatCatalogSyncedAgo } from '@/lib/pluginRegistrySearch';

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}

export function AdminPluginsTab() {
  const [view, setView] = useState<PluginAdminView>('installed');
  const [plugins, setPlugins] = useState<SystemPluginRecord[]>([]);
  const [hostCoreVersion, setHostCoreVersion] = useState('');
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
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestMessage, setManifestMessage] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installingFromLink, setInstallingFromLink] = useState(false);

  const [pluginSourcesOpen, setPluginSourcesOpen] = useState(false);
  const [installFromUrlOpen, setInstallFromUrlOpen] = useState(false);
  const [installFromUrlError, setInstallFromUrlError] = useState<string | null>(null);

  const [inspectorRow, setInspectorRow] = useState<InstalledPluginAdminRow | null>(null);
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({});
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState<SystemPluginRecord['configTemplate']>([]);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const hasAttemptedInitialCatalogLoad = useRef(false);

  const refreshPlugins = useCallback(async () => {
    const response = await fetchAdminPlugins();
    setPlugins(response.plugins);
    setHostCoreVersion(response.hostCoreVersion);
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
        setHostCoreVersion(pluginResponse.hostCoreVersion);
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

  useEffect(() => {
    if (!inspectorRow?.isGlobal) return;
    const updated = plugins.find((plugin) => plugin.id === inspectorRow.id);
    if (!updated) return;
    setInspectorRow((current) => {
      if (!current || current.id !== updated.id) return current;
      return { ...current, source: updated, isEnabled: updated.isEnabled };
    });
  }, [plugins, inspectorRow?.id, inspectorRow?.isGlobal]);

  async function persistRegistryUrl(url: string) {
    await updateAdminSettings({
      plugins: { registryUrl: url },
    });
  }

  const handleSyncRegistry = useCallback(async () => {
    setSyncingRegistry(true);
    setRegistryError(null);
    setRegistryWarnings([]);

    const url = registryUrl.trim() || DEFAULT_PLUGIN_REGISTRY_URL;

    try {
      await persistRegistryUrl(url);

      const response = await fetchPluginRegistry();
      setRegistryUrl(response.registryUrl);
      setDiscovered(response.plugins);
      setLastSyncedAt(new Date().toISOString());
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
  }, [registryUrl]);

  useEffect(() => {
    if (loading || loadError || hasAttemptedInitialCatalogLoad.current) return;
    hasAttemptedInitialCatalogLoad.current = true;
    void handleSyncRegistry();
  }, [loading, loadError, handleSyncRegistry]);

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
      setView('installed');
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

  async function handleInstallFromLink(urlInput: string) {
    const url = urlInput.trim();
    if (!url) {
      setInstallFromUrlError('Enter a secure https:// or http:// manifest URL.');
      return;
    }

    setInstallingFromLink(true);
    setInstallFromUrlError(null);
    setManifestError(null);
    setManifestMessage(null);

    try {
      const plugin = await installPluginFromLink(url);
      await refreshPlugins();
      setManifestMessage(`Installed ${plugin.name} (${plugin.id}) from remote manifest.`);
      setInstallFromUrlOpen(false);
      setView('installed');
    } catch (err) {
      const message =
        err instanceof ApiError && err.details?.length
          ? err.details.join(' ')
          : err instanceof Error
            ? err.message
            : 'Unable to install plugin from manifest link.';
      setInstallFromUrlError(message);
    } finally {
      setInstallingFromLink(false);
    }
  }

  function openInspector(row: InstalledPluginAdminRow) {
    setInspectorRow(row);
    setSaveError(null);
    setSaveMessage(null);
    setEnableError(null);

    const globalPlugin = getGlobalPluginFromRow(row);
    if (globalPlugin) {
      setDraftConfig({ ...globalPlugin.config });
      setDraftEnabled(globalPlugin.isEnabled);
      setDraftTemplate(
        mergePluginConfigFields({
          configTemplate: globalPlugin.configTemplate,
          configSchema: globalPlugin.configSchema,
        }),
      );
    } else {
      setDraftConfig({});
      setDraftEnabled(false);
      setDraftTemplate([]);
    }
  }

  function closeInspector() {
    setInspectorRow(null);
    setDraftConfig({});
    setDraftTemplate([]);
    setSaveError(null);
    setSaveMessage(null);
    setEnableError(null);
  }

  function setDraftField(key: string, value: string | boolean) {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function persistPluginState(
    pluginId: string,
    config: Record<string, unknown>,
    isEnabled: boolean,
  ) {
    return saveAdminPluginConfig(pluginId, { config, isEnabled });
  }

  async function handleToggleEnabled(row: InstalledPluginAdminRow, enabled: boolean) {
    const globalPlugin = getGlobalPluginFromRow(row);
    if (!globalPlugin) return;

    setTogglingId(row.id);
    setActionError(null);

    try {
      const updated = await persistPluginState(globalPlugin.id, globalPlugin.config, enabled);
      setPlugins((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to update plugin.';
      setActionError(message);
      if (inspectorRow?.id === row.id) {
        setEnableError(message);
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSavePlugin(event: FormEvent) {
    event.preventDefault();
    if (!inspectorRow) return;
    const globalPlugin = getGlobalPluginFromRow(inspectorRow);
    if (!globalPlugin) return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setEnableError(null);

    try {
      const updated = await persistPluginState(globalPlugin.id, draftConfig, draftEnabled);
      setPlugins((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
      setSaveMessage(`${updated.name} configuration saved.`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to save plugin configuration.';
      if (err instanceof ApiError && err.status === 409) {
        setEnableError(message);
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  const installedIds = new Set([
    ...plugins.map((p) => p.id),
    ...campaignCapabilities.map((p) => p.id),
  ]);

  if (loading) {
    return <LoadingSpinner label="Loading system plugins…" />;
  }

  if (loadError) {
    return <ErrorBanner message={loadError} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <PluginAdminTabBar view={view} onViewChange={setView} />
          <button
            type="button"
            onClick={() => setPluginSourcesOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Plugin sources"
          >
            <Settings className="size-4" />
            Plugin Sources
          </button>
        </div>
        {hostCoreVersion ? (
          <p className="font-mono text-xs text-muted">
            Host core{' '}
            <span className="text-foreground">{hostCoreVersion}</span>
            {' · '}
            Catalog synced{' '}
            <span className="text-foreground">{formatCatalogSyncedAgo(lastSyncedAt)}</span>
          </p>
        ) : null}
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {view === 'installed' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted">
            <Boxes className="size-5 text-primary" />
            <p className="text-sm">Operational state for plugins installed on this server.</p>
          </div>
          <PluginInstalledTable
            plugins={plugins.filter((p) => p.scope === PluginScopes.GLOBAL)}
            campaignCapabilities={campaignCapabilities}
            togglingId={togglingId}
            onInspect={openInspector}
            onToggleEnabled={(row, enabled) => void handleToggleEnabled(row, enabled)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {manifestError && <ErrorBanner message={manifestError} />}
          {manifestMessage && (
            <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              {manifestMessage}
            </p>
          )}

          <PluginDiscoveryGrid
            entries={discovered}
            installedIds={installedIds}
            installingId={installingId}
            syncingRegistry={syncingRegistry}
            onInstall={(entry) => void handleInstallRegistryEntry(entry)}
            onRefreshCatalog={() => void handleSyncRegistry()}
            onInstallFromUrl={() => {
              setInstallFromUrlError(null);
              setInstallFromUrlOpen(true);
            }}
            onOpenPluginSources={() => setPluginSourcesOpen(true)}
          />
        </div>
      )}

      <PluginInspectorDrawer
        open={inspectorRow !== null}
        row={inspectorRow}
        draftConfig={draftConfig}
        draftEnabled={draftEnabled}
        draftTemplate={draftTemplate}
        saving={saving}
        saveError={saveError}
        saveMessage={saveMessage}
        enableError={enableError}
        onClose={closeInspector}
        onDraftEnabledChange={setDraftEnabled}
        onDraftFieldChange={setDraftField}
        onSave={(event) => void handleSavePlugin(event)}
      />

      <PluginSourcesDrawer
        open={pluginSourcesOpen}
        onClose={() => setPluginSourcesOpen(false)}
        registryUrl={registryUrl}
        onRegistryUrlChange={setRegistryUrl}
        syncingRegistry={syncingRegistry}
        onSync={() => void handleSyncRegistry()}
        lastSyncedAt={lastSyncedAt}
        registryError={registryError}
        registryWarnings={registryWarnings}
        catalogEntryCount={discovered.length}
      />

      <InstallFromManifestModal
        open={installFromUrlOpen}
        installing={installingFromLink}
        error={installFromUrlError}
        onClose={() => {
          setInstallFromUrlOpen(false);
          setInstallFromUrlError(null);
        }}
        onInstall={(url) => void handleInstallFromLink(url)}
      />
    </div>
  );
}
