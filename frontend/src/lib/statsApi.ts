import type { CreatorAttributionResponse, CampaignWorldStatsResponse } from '@shared/statsTypes';
import { apiFetch } from './api';

export async function fetchPublicCreatorAttribution(
  userId: string,
): Promise<CreatorAttributionResponse> {
  return apiFetch<CreatorAttributionResponse>(`/users/${userId}/creator-attribution`);
}

export async function fetchOwnerCreatorAttribution(): Promise<CreatorAttributionResponse> {
  return apiFetch<CreatorAttributionResponse>('/user/creator-attribution');
}

export async function fetchCampaignWorldStats(
  campaignHandle: string,
  days = 30,
): Promise<CampaignWorldStatsResponse> {
  return apiFetch<CampaignWorldStatsResponse>(
    `/campaigns/${encodeURIComponent(campaignHandle)}/world-stats?days=${days}`,
  );
}
