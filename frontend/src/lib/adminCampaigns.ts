import { apiFetch, ApiError } from '@/lib/api';

const API_BASE = '/api';

export interface AdminCampaignRow {
  id: string;
  title: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail: string | null;
  fileSize: number;
  fileSizeFormatted: string;
}

export interface AdminCampaignsPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export type AdminCampaignSortBy = 'title' | 'createdAt' | 'fileSize';
export type AdminCampaignSortOrder = 'asc' | 'desc';

export interface AdminCampaignsQuery {
  page: number;
  limit?: number;
  search?: string;
  sortBy?: AdminCampaignSortBy;
  sortOrder?: AdminCampaignSortOrder;
}

export interface AdminCampaignsResponse {
  totalCount: number;
  campaigns: AdminCampaignRow[];
  pagination: AdminCampaignsPagination;
  filters?: {
    search: string;
    sortBy: AdminCampaignSortBy;
    sortOrder: AdminCampaignSortOrder;
  };
}

export async function fetchAdminCampaigns(
  query: AdminCampaignsQuery,
): Promise<AdminCampaignsResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit ?? 10),
  });
  if (query.search?.trim()) {
    params.set('search', query.search.trim());
  }
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);

  return apiFetch<AdminCampaignsResponse>(`/admin/campaigns?${params.toString()}`);
}

export async function deleteAdminCampaign(
  campaignId: string,
  confirmTitle: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/admin/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ confirmTitle }),
    },
  );
}

export async function downloadCampaignBackup(
  campaignId: string,
  handle: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/campaigns/${encodeURIComponent(campaignId)}/backup`,
    { credentials: 'include' },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Campaign backup failed', res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename =
    match?.[1] ?? `esiana-campaign-${handle}-${Date.now()}.zip`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
