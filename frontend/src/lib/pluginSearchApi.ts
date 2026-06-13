import { apiFetch } from '@/lib/api';

export interface PluginSearchHit {
  pluginId: string;
  collectionId: string;
  label: string;
  id: string;
  title: string;
  subtitle?: string;
  pageId?: string;
  subpath?: string;
}

export async function fetchPluginSearchResults(
  campaignId: string,
  query: string,
  limit = 10,
): Promise<PluginSearchHit[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const data = await apiFetch<{ results: PluginSearchHit[] }>(
    `/campaigns/${encodeURIComponent(campaignId)}/plugins/search?${params.toString()}`,
  );
  return data.results ?? [];
}
