import { apiFetch } from '@/lib/api';
import type { SourceOpenTarget, SourceProviderPresentation, SourceReference, SourceSearchResult } from '@shared/sourceReferences';

export async function fetchSourceProviders(campaignId: string): Promise<SourceProviderPresentation[]> {
  const data = await apiFetch<{ providers: SourceProviderPresentation[] }>(`/campaigns/${encodeURIComponent(campaignId)}/source-providers`);
  return data.providers;
}

export async function searchSourceProviders(campaignId: string, query: string, providerId?: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query, limit: '30' });
  if (providerId) params.set('providerId', providerId);
  return apiFetch<{ results: SourceSearchResult[]; diagnostics: Array<{ providerId: string; status: string }> }>(
    `/campaigns/${encodeURIComponent(campaignId)}/sources/search?${params}`,
    { signal },
  );
}

export async function resolveSource(campaignId: string, reference: SourceReference): Promise<SourceReference> {
  const data = await apiFetch<{ reference: SourceReference }>(`/campaigns/${encodeURIComponent(campaignId)}/sources/resolve`, { method: 'POST', body: JSON.stringify({ reference }) });
  return data.reference;
}

export async function fetchSourceOpenTarget(campaignId: string, reference: SourceReference): Promise<SourceOpenTarget> {
  const data = await apiFetch<{ target: SourceOpenTarget }>(`/campaigns/${encodeURIComponent(campaignId)}/sources/open-target`, { method: 'POST', body: JSON.stringify({ reference }) });
  return data.target;
}
