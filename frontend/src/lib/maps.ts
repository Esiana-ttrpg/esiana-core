import { apiFetch } from './api';
import { campaignWorkspaceIndexPath } from './campaignPaths';
import type { CategoryDiscoverySummary } from './wiki';
import type { ImageCredit } from '@shared/imageCredit';
import type {
  CampaignMapAsset,
  CampaignMapDetail,
  MapLinkedPage,
  MapPinDto,
  MapPinPreviewDto,
  MapPinType,
} from '@/types/maps';

export async function fetchCampaignMaps(
  campaignHandle: string,
): Promise<{
  maps: CampaignMapAsset[];
  discoverySummary?: CategoryDiscoverySummary | null;
}> {
  const data = await apiFetch<{
    maps: CampaignMapAsset[];
    discoverySummary?: CategoryDiscoverySummary | null;
  }>(`/campaigns/${campaignHandle}/maps`);
  return data;
}

export async function fetchCampaignMap(
  campaignHandle: string,
  assetId: string,
): Promise<CampaignMapDetail> {
  return apiFetch<CampaignMapDetail>(`/campaigns/${campaignHandle}/maps/${assetId}`);
}

export async function fetchMapPins(
  campaignHandle: string,
  assetId: string,
): Promise<MapPinDto[]> {
  const data = await apiFetch<{ pins: MapPinDto[] }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/pins`,
  );
  return data.pins;
}

export async function fetchMapPinPreview(
  campaignHandle: string,
  pinId: string,
): Promise<MapPinPreviewDto> {
  return apiFetch<MapPinPreviewDto>(
    `/campaigns/${campaignHandle}/maps/pins/${pinId}/preview`,
  );
}

export async function uploadCampaignMap(
  campaignHandle: string,
  file: File,
): Promise<CampaignMapAsset> {
  const form = new FormData();
  form.append('image', file);
  form.append('type', 'map');
  const data = await apiFetch<{ asset: CampaignMapAsset }>(
    `/campaigns/${campaignHandle}/uploads`,
    {
      method: 'POST',
      body: form,
    },
  );
  return data.asset;
}

export async function deleteCampaignMap(
  campaignHandle: string,
  assetId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/uploads/${assetId}`, {
    method: 'DELETE',
  });
}

export async function linkMapToWikiPage(
  campaignHandle: string,
  assetId: string,
  pageId: string | null,
): Promise<{ linkedPage: MapLinkedPage | null }> {
  return apiFetch(`/campaigns/${campaignHandle}/maps/${assetId}/link-page`, {
    method: 'PATCH',
    body: JSON.stringify({ pageId }),
  });
}

export async function updateCampaignMapDisplayName(
  campaignHandle: string,
  assetId: string,
  displayName: string | null,
): Promise<CampaignMapAsset> {
  return updateCampaignMap(campaignHandle, assetId, { displayName });
}

export async function updateCampaignMap(
  campaignHandle: string,
  assetId: string,
  input: {
    displayName?: string | null;
    visibility?: string;
    imageCredit?: ImageCredit | null;
  },
): Promise<CampaignMapAsset> {
  const data = await apiFetch<{ map: CampaignMapAsset }>(
    `/campaigns/${campaignHandle}/maps/${assetId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return data.map;
}

export function resolveMapsHubPath(campaignHandle: string): string {
  return campaignWorkspaceIndexPath(campaignHandle, 'maps');
}

export async function createMapPin(
  campaignHandle: string,
  assetId: string,
  input: {
    x: number;
    y: number;
    targetPageId?: string | null;
    targetAssetId?: string | null;
    label?: string | null;
    pinType?: MapPinType;
    quickCreate?: { title: string; category?: string };
  },
): Promise<MapPinDto> {
  const data = await apiFetch<{ pin: MapPinDto | null }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/pins`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!data.pin) throw new Error('Pin creation failed');
  return data.pin;
}

export async function updateMapPin(
  campaignHandle: string,
  assetId: string,
  pinId: string,
  input: Partial<{
    x: number;
    y: number;
    label: string | null;
    pinType: MapPinType;
    targetPageId: string | null;
    targetAssetId: string | null;
    revelation?: string;
  }>,
): Promise<MapPinDto> {
  const data = await apiFetch<{ pin: MapPinDto | null }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/pins/${pinId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  if (!data.pin) throw new Error('Pin update failed');
  return data.pin;
}

export async function deleteMapPin(
  campaignHandle: string,
  assetId: string,
  pinId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/maps/${assetId}/pins/${pinId}`, {
    method: 'DELETE',
  });
}

export async function bindWikiPageMapAsset(
  campaignHandle: string,
  pageId: string,
  mapAssetId: string | null,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/map-asset`, {
    method: 'PATCH',
    body: JSON.stringify({ mapAssetId }),
  });
}

export function mapAssetImageUrl(
  assetId: string,
  variant: 'display' | 'thumb' | 'full' = 'display',
): string {
  return `/api/assets/${assetId}?variant=${variant}`;
}

const MAP_PIN_FOLDER_RULES: Partial<Record<MapPinType, string>> = {
  Location: 'Locations',
  Settlement: 'Locations',
  Ruin: 'Locations',
  Dungeon: 'Locations',
  Geography: 'Locations',
  Quest: 'Quests',
};

export function getWikiFolderForMapPinType(pinType: MapPinType): string {
  return MAP_PIN_FOLDER_RULES[pinType] ?? 'Locations';
}

/** Wiki pages under the Locations category folder. */
export function filterLocationWikiPages(
  flatPages: { id: string; title: string; parentId: string | null }[],
): { id: string; title: string }[] {
  const locationsFolder = flatPages.find(
    (page) => page.title === 'Locations' && page.parentId === null,
  );
  if (!locationsFolder) return [];

  const locationIds = new Set<string>();
  const queue = flatPages
    .filter((page) => page.parentId === locationsFolder.id)
    .map((page) => page.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    locationIds.add(current);
    for (const page of flatPages) {
      if (page.parentId === current) queue.push(page.id);
    }
  }

  return flatPages
    .filter((page) => locationIds.has(page.id))
    .map((page) => ({ id: page.id, title: page.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
