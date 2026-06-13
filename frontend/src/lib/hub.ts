import { apiFetch } from './api';
import type { UserHubResponse } from '@/types/hub';

export async function fetchUserHub(): Promise<UserHubResponse> {
  return apiFetch<UserHubResponse>('/user/hub');
}

export async function pinCampaign(campaignId: string): Promise<void> {
  await apiFetch(`/user/campaigns/${campaignId}/pin`, { method: 'PUT' });
}

export async function unpinCampaign(campaignId: string): Promise<void> {
  await apiFetch(`/user/campaigns/${campaignId}/pin`, { method: 'DELETE' });
}

export async function dismissHubAttention(
  dismissKey: string,
  snoozeDays?: 7 | 30,
): Promise<void> {
  await apiFetch('/user/hub/attention/dismiss', {
    method: 'POST',
    body: JSON.stringify({ dismissKey, snoozeDays }),
  });
}
