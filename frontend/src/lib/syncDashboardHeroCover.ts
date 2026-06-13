import { fetchCampaignAssets } from './campaigns';
import type { DashboardConfig, DashboardHeroConfig } from './dashboardConfig';

export function resolveWizardCoverAssetId(
  config: DashboardConfig,
): string | undefined {
  return config.importManifest?.assets?.coverImageAssetId;
}

export async function resolveHeroCoverFromWizardAsset(
  campaignHandle: string,
  config: DashboardConfig,
): Promise<DashboardHeroConfig | null> {
  if (config.hero.coverImageUrl?.trim()) return null;

  const assetId = resolveWizardCoverAssetId(config);
  if (!assetId) return null;

  const assets = await fetchCampaignAssets(campaignHandle, 'campaign-cover');
  const asset = assets.find((row) => row.id === assetId);
  if (!asset) return null;

  return {
    ...config.hero,
    coverImageUrl: `/api/assets/${assetId}`,
  };
}
