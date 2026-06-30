import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Puzzle } from 'lucide-react';
import {
  enableCampaignPlugin,
  fetchCampaignPlugins,
  removeCampaignPlugin,
  saveCampaignPluginConfig,
} from '@/lib/campaignPlugins';
import type {
  CampaignPluginDescriptor,
  CampaignPluginSettingRecord,
} from '@/types/admin';
import { ToggleRow } from '@/components/admin/AdminSectionCard';
import { PluginConfigForm } from '@/components/admin/PluginConfigForm';
import { mergePluginConfigFields } from '@/lib/configSchemaParser';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PluginCampaignSettingsSlot } from '@/plugins/slots';

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}

export function CampaignPluginsSettingsTab({
  campaignId,
  campaignHandle,
}: {
  campaignId: string;
  campaignHandle: string;
}) {
  const [available, setAvailable] = useState<CampaignPluginDescriptor[]>([]);
  const [active, setActive] = useState<CampaignPluginSettingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [enablingId, setEnablingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({});
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refreshPlugins = useCallback(async () => {
    const response = await fetchCampaignPlugins(campaignId);
    setAvailable(response.available);
    setActive(response.active);
    return response;
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchCampaignPlugins(campaignId)
      .then((response) => {
        if (!cancelled) {
          setAvailable(response.available);
          setActive(response.active);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load campaign plugins.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  async function handleEnable(pluginId: string) {
    setEnablingId(pluginId);
    setActionError(null);
    setActionMessage(null);

    try {
      await enableCampaignPlugin(campaignId, pluginId);
      await refreshPlugins();
      setActionMessage('Plugin enabled for this campaign.');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to enable plugin.',
      );
    } finally {
      setEnablingId(null);
    }
  }

  async function handleRemove(pluginId: string, pluginName: string) {
    const confirmed = window.confirm(
      `Remove "${pluginName}" from this campaign? This deletes all plugin data, configuration, and secrets for this campaign. This cannot be undone.`,
    );
    if (!confirmed) return;

    setRemovingId(pluginId);
    setActionError(null);
    setActionMessage(null);

    try {
      await removeCampaignPlugin(campaignId, pluginId);
      if (expandedId === pluginId) {
        setExpandedId(null);
      }
      await refreshPlugins();
      setActionMessage(`Removed ${pluginName} from this campaign.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to remove plugin from campaign.',
      );
    } finally {
      setRemovingId(null);
    }
  }

  function openConfigure(row: CampaignPluginSettingRecord) {
    setExpandedId(row.pluginId);
    setDraftConfig({ ...row.config });
    setDraftEnabled(row.isEnabled);
    setSaveError(null);
  }

  async function handleSave(event: FormEvent, pluginId: string) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setActionError(null);

    try {
      const updated = await saveCampaignPluginConfig(campaignId, pluginId, {
        config: draftConfig,
        isEnabled: draftEnabled,
      });
      setActive((prev) =>
        prev.map((row) => (row.pluginId === updated.pluginId ? updated : row)),
      );
      setActionMessage('Plugin configuration saved.');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to save plugin configuration.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading campaign plugins…" />;
  }

  if (loadError) {
    return <ErrorBanner message={loadError} />;
  }

  const noServerPlugins = available.length === 0 && active.length === 0;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-2">
        <Puzzle className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-white">Campaign plugins</h2>
          <p className="text-sm text-muted">
            Enable and configure plugins installed on this server for this campaign.
          </p>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}
      {actionMessage && (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {actionMessage}
        </p>
      )}

      {noServerPlugins ? (
        <p className="rounded-xl border border-border bg-background/50 px-5 py-4 text-sm text-muted">
          No campaign plugins are installed on this server. Ask your server administrator
          to install campaign plugins from Admin → Plugins.
        </p>
      ) : null}

      {available.length > 0 ? (
        <section className="space-y-4">
          <h3 className={`${META_SECTION_LABEL_CLASS} text-foreground`}>
            Available plugins
          </h3>
          <div className="grid gap-4">
            {available.map((plugin) => (
              <article
                key={plugin.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{plugin.name}</p>
                  <p className="text-xs text-muted">{plugin.description}</p>
                  {plugin.version ? (
                    <p className="mt-1 font-mono text-[10px] text-muted">v{plugin.version}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleEnable(plugin.id)}
                  disabled={enablingId === plugin.id}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60"
                >
                  {enablingId === plugin.id ? 'Enabling…' : 'Enable'}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className={`${META_SECTION_LABEL_CLASS} text-foreground`}>
          Active plugins
        </h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted">
            No plugins enabled for this campaign yet. Enable an available plugin above.
          </p>
        ) : (
          <div className="grid gap-4">
            {active.map((row) => {
              const isExpanded = expandedId === row.pluginId;
              return (
                <article
                  key={row.pluginId}
                  className={`rounded-xl border bg-background/60 ${
                    isExpanded ? 'border-primary/40' : 'border-border'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-foreground">{row.plugin.name}</p>
                      <p className="text-xs text-muted">{row.plugin.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          row.isEnabled
                            ? 'border border-emerald-500/30 text-emerald-300'
                            : 'border border-border text-muted'
                        }`}
                      >
                        {row.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {!isExpanded && (
                        <button
                          type="button"
                          onClick={() => openConfigure(row)}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-elevated"
                        >
                          Configure
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <form
                      onSubmit={(e) => handleSave(e, row.pluginId)}
                      className="space-y-4 border-t border-border p-4"
                    >
                      <ToggleRow
                        label="Enable for this campaign"
                        checked={draftEnabled}
                        onChange={setDraftEnabled}
                      />
                      <PluginConfigForm
                        template={mergePluginConfigFields({
                          configTemplate: row.plugin.configTemplate,
                          configSchema: row.plugin.configSchema,
                        })}
                        config={draftConfig}
                        onChange={(key, value) =>
                          setDraftConfig((prev) => ({ ...prev, [key]: value }))
                        }
                      />
                      {row.plugin.frontendEntry ? (
                        <PluginCampaignSettingsSlot
                          pluginId={row.pluginId}
                          frontendEntry={row.plugin.frontendEntry}
                          campaignId={campaignId}
                          campaignHandle={campaignHandle}
                          config={draftConfig}
                          isEnabled={draftEnabled}
                          uiSlots={row.plugin.uiSlots ?? []}
                          apiBase={
                            import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ||
                            window.location.origin.replace(/\/+$/, '')
                          }
                        />
                      ) : null}
                      {saveError && (
                        <p className="text-sm text-red-300">{saveError}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(null)}
                          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemove(row.pluginId, row.plugin.name)}
                          disabled={removingId === row.pluginId}
                          className="rounded-lg border border-red-900/50 px-4 py-2 text-sm text-red-300 hover:bg-red-950/30 disabled:opacity-60"
                        >
                          {removingId === row.pluginId ? 'Removing…' : 'Remove from campaign'}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
