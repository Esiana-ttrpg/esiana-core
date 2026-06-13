import type { PublicDirectoryCampaign } from '@/types/recruitment';

export function getRecruitmentListingTeaser(
  campaign: PublicDirectoryCampaign,
): string | null {
  const tagline = campaign.recruitmentTagline?.trim();
  if (tagline) return tagline;
  const premise = campaign.recruitmentPremise?.trim();
  if (premise) {
    const flat = premise.replace(/\s+/g, ' ').trim();
    return flat.length > 160 ? `${flat.slice(0, 159)}…` : flat;
  }
  return campaign.description?.trim() ?? null;
}
