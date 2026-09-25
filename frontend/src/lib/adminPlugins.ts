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
  remoteLoaded: boolean;
  warnings?: string[];
}

export function registrySyncWarnings(response: PluginRegistryResponse): string[] {
  const warnings = [...(response.warnings ?? [])];
  if (response.remoteLoaded && response.plugins.length === 0) {
    warnings.push('Registry loaded but contains no plugin entries.');
  }
  return warnings;
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
  hostCoreVersion: string;
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

export interface PluginOAuthClientRecord { clientId: string; hasClientSecret: boolean; updatedAt: string }
export async function fetchPluginOAuthClient(pluginId: string) {
  return apiFetch<{ oauthClient: PluginOAuthClientRecord | null }>(`/admin/plugins/${encodeURIComponent(pluginId)}/oauth-client`);
}
export async function savePluginOAuthClient(pluginId: string, clientId: string, clientSecret: string) {
  return apiFetch<{ oauthClient: PluginOAuthClientRecord }>(`/admin/plugins/${encodeURIComponent(pluginId)}/oauth-client`, { method: 'PUT', body: JSON.stringify({ clientId, ...(clientSecret ? { clientSecret } : {}) }) });
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
