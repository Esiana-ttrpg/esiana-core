import { apiFetch } from '@/lib/api';
import type { GlobalSearchResponse } from '@shared/globalSearch';

export async function fetchGlobalSearch(
  campaignHandle: string,
  options: {
    q: string;
    type?: string | null;
    limit?: number;
  },
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams();
  params.set('q', options.q);
  if (options.type) params.set('type', options.type);
  if (options.limit != null) params.set('limit', String(options.limit));

  return apiFetch<GlobalSearchResponse>(
    `/campaigns/${encodeURIComponent(campaignHandle)}/search?${params.toString()}`,
    { signal },
  );
}
