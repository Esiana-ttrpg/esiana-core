import { roleCapabilitiesFor } from '@shared/campaignPolicy/roleGrants';
import { canViewVisibilityFromCaps } from '@shared/campaignPolicy/resourceAccess';
import { isMembershipRole } from '@shared/campaignPolicy/membershipRoles';
import type { CampaignMemberRole } from '@/types/domain';

export function canViewWikiPage(
  visibility: string,
  role: CampaignMemberRole | null,
): boolean {
  const caps = roleCapabilitiesFor(
    role && isMembershipRole(role) ? role : null,
  );
  return canViewVisibilityFromCaps(caps, visibility);
}
