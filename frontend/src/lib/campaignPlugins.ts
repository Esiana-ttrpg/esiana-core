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
