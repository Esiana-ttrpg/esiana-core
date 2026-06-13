import { CampaignMemberRoles, type CampaignMemberRole } from '@/types/domain';

export function canViewWikiPage(
  visibility: string,
  role: CampaignMemberRole | null,
): boolean {
  if (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  ) {
    return true;
  }

  if (visibility === 'Public') return true;

  if (visibility === 'Party') {
    return (
      role === CampaignMemberRoles.PARTICIPANT ||
      role === CampaignMemberRoles.OBSERVER
    );
  }

  return false;
}
