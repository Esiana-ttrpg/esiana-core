import { apiFetch } from '@/lib/api';
import type { CampaignFormatSlug } from '@shared/campaignFormat';

export interface ContentPackCard {
  kind: 'contentPack';
  source: 'plugin';
  pluginId: string;
  pluginName: string;
  packId: string;
  name: string;
  description: string;
  campaignFormat: CampaignFormatSlug;
  gameSystem?: string;
  genreThemes?: string[];
  author?: string;
  authorUrl?: string;
}

interface ContentPacksResponse {
  packs: ContentPackCard[];
}

export async function fetchContentPacks(): Promise<ContentPackCard[]> {
  const data = await apiFetch<ContentPacksResponse>('/content-packs');
  return data.packs ?? [];
}
