export interface PackCampaignConfigV1 {
  formatVersion: number;
  recruitmentTagline?: string;
  description?: string;
  campaignHomeIntro?: string;
  startingDate?: string;
  startingLocationPageSlug?: string;
  coverImagePath?: string;
}

export function parsePackCampaignConfig(raw: unknown): PackCampaignConfigV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const formatVersion =
    typeof obj.formatVersion === 'number' ? obj.formatVersion : 1;
  if (formatVersion !== 1) return null;

  const config: PackCampaignConfigV1 = { formatVersion: 1 };
  if (typeof obj.recruitmentTagline === 'string' && obj.recruitmentTagline.trim()) {
    config.recruitmentTagline = obj.recruitmentTagline.trim();
  }
  if (typeof obj.description === 'string' && obj.description.trim()) {
    config.description = obj.description.trim();
  }
  if (typeof obj.campaignHomeIntro === 'string' && obj.campaignHomeIntro.trim()) {
    config.campaignHomeIntro = obj.campaignHomeIntro.trim();
  }
  if (typeof obj.startingDate === 'string' && obj.startingDate.trim()) {
    config.startingDate = obj.startingDate.trim();
  }
  if (
    typeof obj.startingLocationPageSlug === 'string' &&
    obj.startingLocationPageSlug.trim()
  ) {
    config.startingLocationPageSlug = obj.startingLocationPageSlug.trim();
  }
  if (typeof obj.coverImagePath === 'string' && obj.coverImagePath.trim()) {
    config.coverImagePath = obj.coverImagePath.trim();
  }
  return config;
}
