import { apiFetch } from '@/lib/api';
import type { FrontendPluginDescriptor } from '@/plugins/slots';

export async function fetchCampaignFrontendPlugins(
  campaignIdOrSlug: string,
): Promise<FrontendPluginDescriptor[]> {
  const data = await apiFetch<{ plugins: FrontendPluginDescriptor[] }>(
    `/campaigns/${encodeURIComponent(campaignIdOrSlug)}/plugins/frontend-runtime`,
  );
  return data.plugins;
}

/** Globally installed+enabled plugins only (no campaign-scoped packages). */
export async function fetchGlobalFrontendPlugins(): Promise<FrontendPluginDescriptor[]> {
  const data = await apiFetch<{ plugins: FrontendPluginDescriptor[] }>(
    `/plugins/frontend-runtime`,
  );
  return data.plugins;
}
