import { Link } from 'react-router-dom';
import { campaignDashboardPath } from '@/lib/campaignPaths';

interface CampaignIdentityLinkProps {
  campaignHandle: string;
  campaignName: string | null;
}

export function CampaignIdentityLink({
  campaignHandle,
  campaignName,
}: CampaignIdentityLinkProps) {
  if (!campaignName) {
    return (
      <span className="inline-block h-5 w-28 animate-pulse rounded bg-elevated" />
    );
  }

  return (
    <Link
      to={campaignDashboardPath(campaignHandle)}
      className="min-w-0 truncate text-lg font-semibold leading-tight whitespace-nowrap transition-colors hover:text-primary sm:text-xl"
      title={campaignName}
    >
      {campaignName}
    </Link>
  );
}
