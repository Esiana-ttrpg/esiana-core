import type {
  CreatorAttributionResponse,
  CampaignWorldStatsResponse,
  UserActivityResponse,
} from '@shared/statsTypes';
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

export async function fetchPublicUserActivity(
  userId: string,
  options?: { limit?: number; before?: string },
): Promise<UserActivityResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const qs = params.toString();
  return apiFetch<UserActivityResponse>(
    `/users/${userId}/activity${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchOwnerUserActivity(
  options?: { limit?: number; before?: string },
): Promise<UserActivityResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const qs = params.toString();
  return apiFetch<UserActivityResponse>(`/user/activity${qs ? `?${qs}` : ''}`);
}
