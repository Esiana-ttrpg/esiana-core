export const CAMPAIGN_FORMATS = ['one-shot', 'campaign'] as const;

export type CampaignFormatSlug = (typeof CAMPAIGN_FORMATS)[number];

export const CAMPAIGN_FORMAT_LABELS: Record<CampaignFormatSlug, string> = {
  'one-shot': 'One-shot',
  campaign: 'Campaign',
};

/** Map manifest slug to Campaign.campaignFormat recruitment value. */
export const CAMPAIGN_FORMAT_TO_RECRUITMENT: Record<CampaignFormatSlug, string> = {
  'one-shot': 'One-shot',
  campaign: 'Campaign',
};

export function isCampaignFormatSlug(value: string): value is CampaignFormatSlug {
  return (CAMPAIGN_FORMATS as readonly string[]).includes(value);
}

export function getCampaignFormatLabel(value: string | null | undefined): string {
  if (!value) return '';
  return isCampaignFormatSlug(value) ? CAMPAIGN_FORMAT_LABELS[value] : value;
}
