import { apiFetch } from './api';
import type { PageNarrativeStatusProjection, PageNarrativeStatusValue } from '@shared/pageNarrativeStatus';

export type { PageNarrativeStatusProjection, PageNarrativeStatusValue };

export interface PageNarrativeStatusResponse {
  narrativeStatus: PageNarrativeStatusProjection;
  stored: { status: PageNarrativeStatusValue; reason: string | null } | null;
}

export async function fetchPageNarrativeStatus(
  campaignHandle: string,
  pageId: string,
): Promise<PageNarrativeStatusResponse> {
  return apiFetch<PageNarrativeStatusResponse>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/narrative-status`,
  );
}

export async function patchPageNarrativeStatus(
  campaignHandle: string,
  pageId: string,
  body: { status: PageNarrativeStatusValue; reason?: string | null },
): Promise<{ narrativeStatus: PageNarrativeStatusProjection }> {
  return apiFetch<{ narrativeStatus: PageNarrativeStatusProjection }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/narrative-status`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export async function batchFetchPageNarrativeStatus(
  campaignHandle: string,
  pageIds: string[],
): Promise<Record<string, PageNarrativeStatusProjection>> {
  if (pageIds.length === 0) return {};
  const qs = encodeURIComponent(pageIds.join(','));
  const data = await apiFetch<{
    items: Record<string, PageNarrativeStatusProjection>;
  }>(`/campaigns/${campaignHandle}/wiki/narrative-status?ids=${qs}`);
  return data.items;
}
