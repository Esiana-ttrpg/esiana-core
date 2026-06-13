import { apiFetch } from '@/lib/api';

export interface ApiUsageLeader {
  userId: string;
  requestCount: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function fetchTopApiUsage(): Promise<ApiUsageLeader[]> {
  const data = await apiFetch<{ leaders: ApiUsageLeader[] }>(
    '/admin/analytics/top-usage',
  );
  return data.leaders;
}

export type AdminUsageAnalytics = {
  window: { start: string; end: string; timezone: 'UTC' };
  totals: { totalRequests: number; tooManyRequests: number };
  topSpikers: Array<{ campaignId: string; requestCount: number }>;
  trafficByHour: Array<{ ts: string; count: number }>;
};

export async function fetchAdminUsageAnalytics(): Promise<AdminUsageAnalytics> {
  return apiFetch<AdminUsageAnalytics>('/admin/analytics/usage');
}
