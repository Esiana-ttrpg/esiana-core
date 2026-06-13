import { apiFetch } from '@/lib/api';
import { campaignApiPath } from '@/lib/campaignPaths';

export interface CampaignActivityRow {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  parentContext: string | null;
  pageSizeBytes: number | null;
  deltaBytes: number | null;
  createdAt: string;
  user: {
    id: string;
    label: string;
    avatarUrl: string | null;
  };
}

export interface CampaignActivityPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export interface CampaignActivityListResult {
  activity: CampaignActivityRow[];
  pagination: CampaignActivityPagination;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export async function listCampaignActivity(
  campaignHandle: string,
  { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {},
): Promise<CampaignActivityListResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const data = await apiFetch<CampaignActivityListResult>(
    `${campaignApiPath(campaignHandle, 'activity')}?${params.toString()}`,
  );
  return {
    activity: data.activity ?? [],
    pagination: data.pagination ?? {
      currentPage: page,
      totalPages: 1,
      totalCount: data.activity?.length ?? 0,
      limit,
    },
  };
}
