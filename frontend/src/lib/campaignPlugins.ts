import { apiFetch } from '@/lib/api';
import type {
  CampaignPluginDescriptor,
  CampaignPluginSettingRecord,
  SystemPluginConfigPayload,
} from '@/types/admin';

export interface CampaignPluginsListResponse {
  available: CampaignPluginDescriptor[];
  active: CampaignPluginSettingRecord[];
}

export interface PluginConnectionRecord {
  id: string; pluginId: string; campaignId: string; ownerType: 'campaign' | 'user'; ownerId: string;
  authType: 'oauth2' | 'apiKey' | 'bearer'; status: string; accountLabel: string | null;
  scopes: string[]; expiresAt: string | null; lastError: string | null; updatedAt: string;
}

export interface PluginConnectionsResponse {
  provider: { id: string; displayName: string; authType: string; ownership: Array<'campaign' | 'user'> };
  connections: PluginConnectionRecord[];
}

export function fetchPluginConnections(campaignId: string, pluginId: string) {
  return apiFetch<PluginConnectionsResponse>(`/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}/connections`);
}

export async function connectStaticPlugin(campaignId: string, pluginId: string, payload: { ownerType: 'campaign' | 'user'; credential: string; accountLabel?: string }) {
  return apiFetch<{ connection: PluginConnectionRecord }>(`/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}/connections/static`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function disconnectPluginConnection(campaignId: string, pluginId: string, connectionId: string) {
  return apiFetch<{ connection: PluginConnectionRecord }>(`/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}/connections/${encodeURIComponent(connectionId)}`, { method: 'DELETE' });
}

export async function startPluginOAuth(campaignId: string, pluginId: string, ownerType: 'campaign' | 'user', returnTo: string) {
  return apiFetch<{ authorizationUrl: string }>(`/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}/connections/oauth/start`, { method: 'POST', body: JSON.stringify({ ownerType, returnTo }) });
}

export async function fetchCampaignPlugins(
  campaignId: string,
): Promise<CampaignPluginsListResponse> {
  return apiFetch<CampaignPluginsListResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/plugins`,
  );
}

export async function enableCampaignPlugin(
  campaignId: string,
  pluginId: string,
): Promise<CampaignPluginSettingRecord> {
  const data = await apiFetch<{ plugin: CampaignPluginSettingRecord }>(
    `/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}/enable`,
    { method: 'POST', body: JSON.stringify({}) },
  );
  return data.plugin;
}

export async function removeCampaignPlugin(
  campaignId: string,
  pluginId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}`,
    { method: 'DELETE' },
  );
}

export async function saveCampaignPluginConfig(
  campaignId: string,
  pluginId: string,
  payload: SystemPluginConfigPayload,
): Promise<CampaignPluginSettingRecord> {
  const data = await apiFetch<{ plugin: CampaignPluginSettingRecord }>(
    `/campaigns/${encodeURIComponent(campaignId)}/plugins/${encodeURIComponent(pluginId)}/config`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.plugin;
}
