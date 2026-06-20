import type { CampaignSummary } from '@/types/campaign';

export function sortCampaignsByName(campaigns: CampaignSummary[]): CampaignSummary[] {
  return [...campaigns].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
