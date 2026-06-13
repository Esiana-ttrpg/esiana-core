import type { PublicDirectoryCampaign } from '@/types/recruitment';
import { CampaignPresenceCard } from '@/components/campaign-presence/CampaignPresenceCard';

interface FeaturedRecruitmentCardProps {
  campaign: PublicDirectoryCampaign;
}

/** @deprecated Use CampaignPresenceCard variant="featured" directly. */
export function FeaturedRecruitmentCard({ campaign }: FeaturedRecruitmentCardProps) {
  return <CampaignPresenceCard campaign={campaign} variant="featured" />;
}
