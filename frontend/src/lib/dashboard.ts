import { apiFetch } from './api';
import type { DashboardBundle, DashboardConfig } from './dashboardConfig';

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
