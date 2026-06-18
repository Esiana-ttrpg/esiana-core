import { apiFetch, apiFetchOptional } from './api';
import type {
  CampaignDetail,
  CampaignDiscoverabilityValue,
  CampaignSummary,
  CreateCampaignInput,
  User,
} from '@/types/campaign';

export async function fetchCurrentUser(): Promise<User | null> {
  const data = await apiFetchOptional<{ user: User }>('/auth/me');
  return data?.user ?? null;
}

export async function login(
  email: string,
  password: string,
): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function register(
  email: string,
  password: string,
): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function fetchPublicCampaigns(): Promise<CampaignSummary[]> {
  const data = await apiFetch<{ campaigns: CampaignSummary[] }>(
    '/campaigns/public',
  );
  return data.campaigns ?? [];
}

export async function fetchMyCampaigns(): Promise<CampaignSummary[]> {
  const data = await apiFetch<{ campaigns: CampaignSummary[] }>('/campaigns');
  return data.campaigns ?? [];
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CampaignSummary> {
  const data = await apiFetch<{ campaign: CampaignSummary }>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.campaign;
}

export interface CreateCampaignWizardInput {
  name: string;
  description?: string;
  discoverability?: CampaignDiscoverabilityValue;
  language?: string | null;
  gameSystem?: string | null;
  customGameSystemName?: string | null;
  coverImage?: File | null;
  markdownZipFile?: File | null;
  backupZipFile?: File | null;
  calendarConfigFile?: File | null;
  importManifest?: {
    genreThemes: string[];
    folderMappings: Array<{
      sourceFolderName: string;
      targetModule: string;
      isAutoMatched?: boolean;
    }>;
    importFormat?: 'obsidian' | 'kanka-json';
    userDefaults?: {
      docs?: string[];
      recruitmentPreferences?: boolean;
    };
    generator?: {
      pluginId: string;
      presetId: string;
      seed?: string;
      density?: 'quiet' | 'active' | 'obsessive';
      attachCampaignPlugins?: string[];
    };
    bootstrap?: {
      kind: 'sampleData' | 'contentPack';
      profileId?: string;
      pluginId?: string;
      packId?: string;
      seed?: string;
      density?: 'quiet' | 'active' | 'obsessive';
    };
  };
}

export async function createCampaignWithWizard(
  input: CreateCampaignWizardInput,
): Promise<CampaignSummary> {
  const form = new FormData();
  form.set('name', input.name);
  if (input.description) form.set('description', input.description);
  if (input.discoverability != null) {
    form.set('discoverability', input.discoverability);
  }
  if (input.language != null) form.set('language', input.language);
  if (input.gameSystem != null) form.set('gameSystem', input.gameSystem);
  if (input.customGameSystemName != null) {
    form.set('customGameSystemName', input.customGameSystemName);
  }
  if (input.coverImage) form.set('coverImage', input.coverImage);
  if (input.markdownZipFile) form.set('markdownZipFile', input.markdownZipFile);
  if (input.backupZipFile) form.set('backupZipFile', input.backupZipFile);
  if (input.calendarConfigFile) {
    form.set('calendarConfigFile', input.calendarConfigFile);
  }
  if (input.importManifest) {
    form.set('wizardImport', JSON.stringify(input.importManifest));
  }

  const data = await apiFetch<{ campaign: CampaignSummary }>('/campaigns', {
    method: 'POST',
    body: form,
  });
  return data.campaign;
}

export async function fetchCampaign(
  campaignHandle: string,
): Promise<CampaignDetail> {
  const data = await apiFetch<{ campaign: CampaignDetail }>(
    `/campaigns/${campaignHandle}`,
  );
  return data.campaign;
}

export async function updateCampaignSidebar(
  campaignHandle: string,
  body: {
    headers: import('@/lib/sidebarConfig').SidebarConfigHeaders;
    worldLoreOrder: import('@/lib/sidebarConfig').SidebarOrderItem[];
    playOrder: import('@/lib/sidebarConfig').SidebarOrderItem[];
    toolsOrder: import('@/lib/sidebarConfig').SidebarOrderItem[];
    fixedSectionIcons?: import('@/lib/sidebarConfig').SidebarConfig['fixedSectionIcons'];
    fixedSectionVisibility?: import('@/lib/sidebarConfig').SidebarConfig['fixedSectionVisibility'];
  },
): Promise<import('@/lib/sidebarConfig').SidebarConfig> {
  const data = await apiFetch<{ sidebarConfig: import('@/lib/sidebarConfig').SidebarConfig }>(
    `/campaigns/${campaignHandle}/settings/sidebar`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
  return data.sidebarConfig;
}

export interface CampaignUploadAsset {
  id: string;
  url: string;
  type: string;
  displayName?: string | null;
  thumbnailUrl?: string | null;
}

export interface CampaignImageIngestResult {
  asset: CampaignUploadAsset;
  referenceUrl: string;
}

export function resolveAssetDeliveryUrl(result: CampaignImageIngestResult): string {
  return result.referenceUrl || `/api/assets/${result.asset.id}`;
}

const ASSET_TYPE_FALLBACK_LABELS: Record<string, string> = {
  map: 'Untitled map',
  scene: 'Scene image',
  generic: 'Image',
  'campaign-cover': 'Campaign cover',
  'tag-icon': 'Tag icon',
  'sidebar-icon': 'Sidebar icon',
};

function filenameFromAssetUrl(url: string): string | null {
  const last = url.split('/').pop();
  if (!last) return null;
  const decoded = decodeURIComponent(last);
  const stem = decoded.replace(/\.[^.]+$/, '').trim();
  return stem.length > 0 ? stem : null;
}

/** User-facing label for campaign upload / haven art pickers. */
export function formatCampaignAssetLabel(
  asset: Pick<CampaignUploadAsset, 'id' | 'type' | 'url' | 'displayName'>,
  mapTitleById?: ReadonlyMap<string, string>,
): string {
  if (asset.type === 'map') {
    const mapTitle = mapTitleById?.get(asset.id);
    if (mapTitle) return mapTitle;
  }

  const custom = asset.displayName?.trim();
  if (custom) return custom;

  const fromFile = filenameFromAssetUrl(asset.url);
  if (fromFile) return fromFile;

  return ASSET_TYPE_FALLBACK_LABELS[asset.type] ?? asset.type;
}

export async function uploadCampaignCoverImage(
  campaignHandle: string,
  file: File,
): Promise<CampaignImageIngestResult> {
  return uploadCampaignImage(campaignHandle, file, 'campaign-cover');
}

export async function uploadCampaignImage(
  campaignHandle: string,
  file: File,
  type = 'generic',
): Promise<CampaignImageIngestResult> {
  const form = new FormData();
  form.append('image', file);
  form.append('type', type);
  const data = await apiFetch<CampaignImageIngestResult>(
    `/campaigns/${campaignHandle}/uploads`,
    {
      method: 'POST',
      body: form,
    },
  );
  return {
    asset: data.asset,
    referenceUrl: data.referenceUrl ?? `/api/assets/${data.asset.id}`,
  };
}

export async function importCampaignImageFromUrl(
  campaignHandle: string,
  url: string,
  type = 'generic',
): Promise<CampaignImageIngestResult> {
  const data = await apiFetch<CampaignImageIngestResult>(
    `/campaigns/${campaignHandle}/assets/import-url`,
    {
      method: 'POST',
      body: JSON.stringify({ url, type }),
    },
  );
  return {
    asset: data.asset,
    referenceUrl: data.referenceUrl ?? `/api/assets/${data.asset.id}`,
  };
}

export async function fetchCampaignAssets(
  campaignHandle: string,
  type?: string,
): Promise<CampaignUploadAsset[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const data = await apiFetch<{ assets: CampaignUploadAsset[] }>(
    `/campaigns/${campaignHandle}/uploads${query}`,
  );
  return data.assets ?? [];
}

export async function uploadCampaignSidebarSectionIcon(
  campaignHandle: string,
  sectionId: string,
  file: File,
): Promise<import('@/lib/sidebarConfig').SidebarConfig> {
  const form = new FormData();
  form.set('file', file);
  const data = await apiFetch<{
    sidebarConfig: import('@/lib/sidebarConfig').SidebarConfig;
  }>(`/campaigns/${campaignHandle}/settings/sidebar/${encodeURIComponent(sectionId)}/icon`, {
    method: 'POST',
    body: form,
  });
  return data.sidebarConfig;
}

export async function updateCampaignSettings(
  campaignId: string,
  body: Record<string, unknown>,
): Promise<CampaignDetail> {
  const data = await apiFetch<{ campaign: CampaignDetail }>(
    `/campaigns/${campaignId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
  return data.campaign;
}

export async function fetchCampaignJoinRequests(
  campaignHandle: string,
): Promise<import('@/types/recruitment').CampaignJoinRequestRow[]> {
  const data = await apiFetch<{
    requests: import('@/types/recruitment').CampaignJoinRequestRow[];
  }>(`/campaigns/${campaignHandle}/join-requests`);
  return data.requests ?? [];
}

export async function respondToCampaignJoinRequest(
  campaignId: string,
  requestId: string,
  status: 'ACCEPTED' | 'REJECTED',
  options?: { declineReasonCode?: string | null; declineMessage?: string | null },
): Promise<void> {
  await apiFetch(`/campaigns/${campaignId}/requests/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      ...(status === 'REJECTED' && options
        ? {
            declineReasonCode: options.declineReasonCode ?? null,
            declineMessage: options.declineMessage ?? null,
          }
        : {}),
    }),
  });
}

export async function applyToCampaignRecruitment(
  campaignId: string,
  message: string,
  inviteToken?: string | null,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignId}/apply`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(inviteToken?.trim() ? { inviteToken: inviteToken.trim() } : {}),
    }),
  });
}

export async function applyToCampaignBySlugRecruitment(
  campaignHandle: string,
  message?: string,
  inviteToken?: string | null,
): Promise<void> {
  await apiFetch(`/campaigns/slug/${campaignHandle}/apply`, {
    method: 'POST',
    body: JSON.stringify({
      ...(message?.trim() ? { message: message.trim() } : {}),
      ...(inviteToken?.trim() ? { inviteToken: inviteToken.trim() } : {}),
    }),
  });
}

export async function fetchPublicDirectory(): Promise<
  import('@/types/recruitment').PublicDirectoryCampaign[]
> {
  const data = await apiFetch<{
    campaigns: import('@/types/recruitment').PublicDirectoryCampaign[];
  }>('/public-directory');
  return data.campaigns ?? [];
}

export async function fetchFeaturedRecruitmentCampaigns(): Promise<
  import('@/types/recruitment').PublicDirectoryCampaign[]
> {
  const data = await apiFetch<{
    campaigns: import('@/types/recruitment').PublicDirectoryCampaign[];
  }>('/recruitment/featured');
  return data.campaigns ?? [];
}

export async function fetchRecruitmentDirectory(params?: {
  page?: number;
  limit?: number;
  gameSystem?: string;
  externalTool?: string;
  genreThemes?: string[];
}): Promise<{
  campaigns: import('@/types/recruitment').PublicDirectoryCampaign[];
  pagination: import('@/types/recruitment').RecruitmentPagination;
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.gameSystem) query.set('gameSystem', params.gameSystem);
  if (params?.externalTool) query.set('externalTool', params.externalTool);
  if (params?.genreThemes?.length) query.set('genreThemes', params.genreThemes.join(','));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await apiFetch<{
    campaigns: import('@/types/recruitment').PublicDirectoryCampaign[];
    pagination: import('@/types/recruitment').RecruitmentPagination;
  }>(`/recruitment/all${suffix}`);
  return data;
}

export async function fetchRecruitmentLobby(
  handle: string,
): Promise<import('@/types/recruitment').RecruitmentLobbyResponse> {
  const data = await apiFetch<import('@/types/recruitment').RecruitmentLobbyResponse>(
    `/recruitment/lobby/${handle}`,
  );
  return data;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await apiFetch(`/campaigns/${campaignId}`, { method: 'DELETE' });
}

export async function setCampaignArchived(
  campaignId: string,
  archived: boolean,
): Promise<CampaignDetail> {
  return updateCampaignSettings(campaignId, { archived });
}

export async function duplicateCampaign(
  sourceCampaignId: string,
  payload: {
    name: string;
    discoverability: CampaignDiscoverabilityValue;
    copy: import('@shared/campaignCloneOptions').CampaignCloneOptions;
    presetUsed?: string;
  },
): Promise<CampaignSummary> {
  const data = await apiFetch<{ campaign: CampaignSummary }>(
    `/campaigns/${sourceCampaignId}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.campaign;
}
