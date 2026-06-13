import type { ImageCredit } from '@shared/imageCredit';
import { apiFetch } from './api';

export type VisualAtlasFilter =
  | 'characters'
  | 'locations'
  | 'bestiary'
  | 'organizations'
  | 'resources';

export type VisualAtlasSourceKind =
  | 'portrait'
  | 'banner'
  | 'artwork'
  | 'map'
  | 'handout';

export interface VisualAtlasItem {
  id: string;
  imageUrl: string;
  thumbUrl?: string;
  caption?: string;
  imageCredit?: ImageCredit;
  sourceKind: VisualAtlasSourceKind;
  filter: VisualAtlasFilter | null;
  pageId: string;
  pageTitle: string;
  assetId?: string;
}

export interface VisualAtlasCampaignBanner {
  id: string;
  imageUrl: string;
  label: string;
  linkTarget: 'dashboard' | 'party';
}

export interface VisualAtlasPayload {
  campaignBanners: VisualAtlasCampaignBanner[];
  items: VisualAtlasItem[];
}

export type VisualAtlasFilterSelection = VisualAtlasFilter | 'all';

export const VISUAL_ATLAS_FILTERS: Array<{
  id: VisualAtlasFilterSelection;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'characters', label: 'Characters' },
  { id: 'locations', label: 'Locations' },
  { id: 'bestiary', label: 'Bestiary' },
  { id: 'organizations', label: 'Organizations' },
  { id: 'resources', label: 'Resources' },
];

export const VISUAL_ATLAS_SOURCE_LABELS: Record<VisualAtlasSourceKind, string> = {
  portrait: 'Portrait',
  banner: 'Banner',
  artwork: 'Artwork',
  map: 'Map',
  handout: 'Handout',
};

export async function fetchVisualAtlas(
  campaignHandle: string,
): Promise<VisualAtlasPayload> {
  return apiFetch<VisualAtlasPayload>(`/campaigns/${campaignHandle}/visual-atlas`);
}

export function filterVisualAtlasItems(
  items: VisualAtlasItem[],
  selection: VisualAtlasFilterSelection,
): VisualAtlasItem[] {
  if (selection === 'all') return items;
  return items.filter((item) => item.filter === selection);
}
