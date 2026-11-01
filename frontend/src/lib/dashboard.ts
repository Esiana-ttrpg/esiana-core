import { apiFetch } from './api';
import type { DashboardBundle, DashboardConfig } from './dashboardConfig';
import type { AnnouncementInput, CampaignAnnouncement, CampaignStatistics } from '@shared/dashboardCampaignFeatures';

export function fetchCampaignStatistics(handle: string, days = 30) {
  return apiFetch<CampaignStatistics>(`/campaigns/${handle}/campaign-statistics?days=${days}`);
}
export function fetchCampaignAnnouncements(handle: string) {
  return apiFetch<{ announcements: CampaignAnnouncement[] }>(`/campaigns/${handle}/dashboard/announcements`);
}
export function saveCampaignAnnouncement(handle: string, input: AnnouncementInput, existing?: CampaignAnnouncement) {
  return apiFetch<{ announcements: CampaignAnnouncement[] }>(`/campaigns/${handle}/dashboard/announcements${existing ? `/${existing.id}` : ''}`, {
    method: existing ? 'PATCH' : 'POST', body: JSON.stringify({ ...input, expectedUpdatedAt: existing?.updatedAt }),
  });
}
export function deleteCampaignAnnouncement(handle: string, id: string) {
  return apiFetch<void>(`/campaigns/${handle}/dashboard/announcements/${id}`, { method: 'DELETE' });
}

export async function fetchDashboardBundle(
  campaignHandle: string,
): Promise<DashboardBundle> {
  return apiFetch<DashboardBundle>(`/campaigns/${campaignHandle}/dashboard`);
}

export async function updateDashboardLayout(
  campaignHandle: string,
  config: DashboardConfig,
): Promise<DashboardConfig> {
  const data = await apiFetch<{ dashboardConfig: DashboardConfig }>(
    `/campaigns/${campaignHandle}/dashboard/layout`,
    {
      method: 'PATCH',
      body: JSON.stringify(config),
    },
  );
  return data.dashboardConfig;
}
