import { normalizeDiscoverability, CampaignDiscoverability } from '../../../../../shared/campaignPolicy/discoverability.js';
import type { PersonalStatisticsVisibility } from '../../../../../shared/statsTypes.js';

export type SubjectCampaignMembership = {
  campaignId: string;
  discoverability: string;
};

export function isPublicCampaign(discoverability: string): boolean {
  return normalizeDiscoverability(discoverability) === CampaignDiscoverability.PUBLIC;
}

export function selectScopedCampaignIds(input: {
  subjectMemberships: SubjectCampaignMembership[];
  viewerCampaignIds: Iterable<string>;
  visibility: PersonalStatisticsVisibility;
  campaignId?: string | null;
}): { campaignIds: string[]; unknownCampaign: boolean } {
  const viewerSet = new Set(input.viewerCampaignIds);
  const allowed = input.subjectMemberships.filter((membership) => {
    if (input.visibility === 'owner') return true;
    if (isPublicCampaign(membership.discoverability)) return true;
    return input.visibility === 'viewerAuthorized' && viewerSet.has(membership.campaignId);
  });
  const allowedIds = allowed.map((membership) => membership.campaignId);

  if (input.campaignId) {
    if (!allowedIds.includes(input.campaignId)) {
      return { campaignIds: [], unknownCampaign: true };
    }
    return { campaignIds: [input.campaignId], unknownCampaign: false };
  }

  return { campaignIds: allowedIds, unknownCampaign: false };
}
