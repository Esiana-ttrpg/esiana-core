import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  buildCampaignBannerStyle,
} from '@/lib/campaignCardPresentation';
import { getCampaignLastOpenedAt } from '@/lib/campaignRecency';
import { campaignPath } from '@/lib/campaignPaths';
import { formatLastOpened } from '@/utils/formatDate';
import type { CampaignSummary } from '@/types/campaign';

interface CampaignSwitchRecentRowProps {
  campaign: CampaignSummary;
  isCurrent: boolean;
  onSelect: () => void;
}

export function CampaignSwitchRecentRow({
  campaign,
  isCurrent,
  onSelect,
}: CampaignSwitchRecentRowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { coverUrl, gradientStyle } = buildCampaignBannerStyle(campaign);
  const lastOpenedAt = getCampaignLastOpenedAt(campaign.id);
  const lastOpenedLabel = formatLastOpened(lastOpenedAt ?? undefined);

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
        {isCurrent ? (
          <p className="text-xs font-medium text-primary">{t('accountMenu.current')}</p>
        ) : null}
        {lastOpenedLabel ? (
          <p className="text-xs text-muted">{lastOpenedLabel}</p>
        ) : null}
      </div>
    </button>
  );
}
