import type {
  CreatorAttributionResponse,
  CampaignWorldStatsResponse,
  PersonalStatisticsRangeMode,
  PersonalStatisticsResponse,
  UserActivityResponse,
} from '@shared/statsTypes';
import type {
  WrappedYearResponse,
  WrappedYearsResponse,
} from '@shared/wrappedTypes';
import { apiFetch } from './api';

export async function fetchPublicCreatorAttribution(
  userId: string,
): Promise<CreatorAttributionResponse> {
  return apiFetch<CreatorAttributionResponse>(`/users/${userId}/creator-attribution`);
}

export async function fetchOwnerCreatorAttribution(): Promise<CreatorAttributionResponse> {
  return apiFetch<CreatorAttributionResponse>('/user/creator-attribution');
}

function personalStatisticsParams(options?: {
  range?: PersonalStatisticsRangeMode;
  from?: string;
  to?: string;
  campaignId?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('version', '1');
  if (options?.range) params.set('range', options.range);
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.campaignId) params.set('campaignId', options.campaignId);
  return params;
}

export async function fetchOwnerPersonalStatistics(options?: {
  range?: PersonalStatisticsRangeMode;
  from?: string;
  to?: string;
  campaignId?: string;
}): Promise<PersonalStatisticsResponse> {
  const params = personalStatisticsParams(options);
  return apiFetch<PersonalStatisticsResponse>(`/user/statistics?${params.toString()}`);
}

export async function downloadOwnerStatisticsExport(
  format: 'json' | 'csv',
  options?: {
    range?: PersonalStatisticsRangeMode;
    from?: string;
    to?: string;
    campaignId?: string;
  },
): Promise<void> {
  const params = personalStatisticsParams(options);
  params.set('format', format);
  const res = await fetch(`/api/user/statistics/export?${params.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Statistics export could not be downloaded.');
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `esiana-personal-statistics.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
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

export async function fetchOwnerWrappedYears(): Promise<WrappedYearsResponse> {
  return apiFetch<WrappedYearsResponse>('/user/wrapped/years');
}

export async function fetchOwnerWrappedYear(
  year: number,
): Promise<WrappedYearResponse> {
  return apiFetch<WrappedYearResponse>(`/user/wrapped/${year}`);
}

export async function regenerateOwnerWrappedYear(
  year: number,
): Promise<WrappedYearResponse> {
  return apiFetch<WrappedYearResponse>(`/user/wrapped/${year}/regenerate`, {
    method: 'POST',
  });
}

export async function publishOwnerWrappedYear(
  year: number,
): Promise<WrappedYearResponse> {
  return apiFetch<WrappedYearResponse>(`/user/wrapped/${year}/publish`, {
    method: 'POST',
  });
}

export async function unpublishOwnerWrappedYear(
  year: number,
): Promise<WrappedYearResponse> {
  return apiFetch<WrappedYearResponse>(`/user/wrapped/${year}/publish`, {
    method: 'DELETE',
  });
}

/** Public published edition — 404 when unpublished (existence not revealed). */
export async function fetchPublishedWrappedYear(
  userId: string,
  year: number,
): Promise<WrappedYearResponse> {
  return apiFetch<WrappedYearResponse>(`/users/${userId}/wrapped/${year}`);
}
