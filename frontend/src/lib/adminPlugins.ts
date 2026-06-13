import { apiFetch } from '@/lib/api';
import type { PluginManifest, PluginRegistryEntry } from '@/lib/pluginManifest';
import type {
  CampaignPluginCapabilityRecord,
  SystemPluginConfigPayload,
  SystemPluginRecord,
} from '@/types/admin';

export interface PluginRegistryResponse {
  registryUrl: string;
  plugins: PluginRegistryEntry[];
  warnings?: string[];
}

export interface PluginRegistryInstallResponse {
  plugin: SystemPluginRecord | { id: string; name: string; scope: string };
  install: {
    systemPluginId: string;
    installedPluginName: string;
    installPath: string;
    commitSha: string;
    scope: string;
  };
}

export interface AdminPluginsResponse {
  plugins: SystemPluginRecord[];
  campaignCapabilities: CampaignPluginCapabilityRecord[];
}

export async function fetchAdminPlugins(): Promise<AdminPluginsResponse> {
  return apiFetch<AdminPluginsResponse>('/admin/plugins');
}

export async function fetchPluginRegistry(): Promise<PluginRegistryResponse> {
  return apiFetch<PluginRegistryResponse>('/admin/plugins/registry');
}

export async function installPluginFromRegistry(
  entry: PluginRegistryEntry,
): Promise<PluginRegistryInstallResponse> {
  return apiFetch<PluginRegistryInstallResponse>('/admin/plugins/install-from-registry', {
    method: 'POST',
    body: JSON.stringify({ entry }),
  });
}

export async function saveAdminPluginConfig(
  pluginId: string,
  payload: SystemPluginConfigPayload,
): Promise<SystemPluginRecord> {
  const data = await apiFetch<{ plugin: SystemPluginRecord }>(
    `/admin/plugins/${encodeURIComponent(pluginId)}/config`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.plugin;
}

export async function registerPluginManifest(
  manifest: PluginManifest,
): Promise<SystemPluginRecord> {
  const data = await apiFetch<{ plugin: SystemPluginRecord }>(
    '/admin/plugins/register-manifest',
    {
      method: 'POST',
      body: JSON.stringify({ manifest }),
    },
  );
  return data.plugin;
}

export async function installPluginFromLink(url: string): Promise<SystemPluginRecord> {
  const data = await apiFetch<{ plugin: SystemPluginRecord }>(
    '/admin/plugins/install-from-link',
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    },
  );
  return data.plugin;
}

export async function reloadPluginRuntime(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/admin/plugins/reload-runtime', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
