import { useNavigate } from 'react-router-dom';
import { membershipRoleUiLabel } from '@/types/domain';
import {
  buildCampaignBannerStyle,
} from '@/lib/campaignCardPresentation';
import { getCampaignLastOpenedAt } from '@/lib/campaignRecency';
import { campaignPath } from '@/lib/campaignPaths';
import { formatLastOpened } from '@/utils/formatDate';
import type { CampaignSummary } from '@/types/campaign';

interface CampaignSwitchRecentRowProps {
  campaign: CampaignSummary;
  onSelect: () => void;
}

export function CampaignSwitchRecentRow({
  campaign,
  onSelect,
}: CampaignSwitchRecentRowProps) {
  const navigate = useNavigate();
  const { coverUrl, gradientStyle } = buildCampaignBannerStyle(campaign);
  const roleLabel = membershipRoleUiLabel(campaign.role);
  const lastOpenedLabel = formatLastOpened(
    getCampaignLastOpenedAt(campaign.id) ?? undefined,
  );

  function handleClick() {
    onSelect();
    navigate(campaignPath(campaign.handle));
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className="flex w-full gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-elevated"
    >
      <div
        className="size-12 shrink-0 overflow-hidden rounded-md bg-elevated"
        style={
          coverUrl
            ? {
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : gradientStyle
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{campaign.name}</p>
        {roleLabel ? (
          <p className="truncate text-xs text-muted">{roleLabel}</p>
        ) : null}
        {lastOpenedLabel ? (
          <p className="truncate text-xs text-muted">{lastOpenedLabel}</p>
        ) : null}
      </div>
    </button>
  );
}
