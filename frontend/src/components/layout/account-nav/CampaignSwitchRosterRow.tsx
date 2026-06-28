import { useNavigate } from 'react-router-dom';
import { membershipRoleUiLabel } from '@/types/domain';
import { getCampaignLastOpenedAt } from '@/lib/campaignRecency';
import { campaignPath } from '@/lib/campaignPaths';
import { formatFaintRecency } from '@/utils/formatDate';
import type { CampaignSummary } from '@/types/campaign';

interface CampaignSwitchRosterRowProps {
  campaign: CampaignSummary;
  onSelect: () => void;
}

export function CampaignSwitchRosterRow({ campaign, onSelect }: CampaignSwitchRosterRowProps) {
  const navigate = useNavigate();
  const roleLabel = membershipRoleUiLabel(campaign.role);
  const recency = formatFaintRecency(getCampaignLastOpenedAt(campaign.id) ?? undefined);
  const meta = recency ? `${roleLabel} · ${recency}` : roleLabel;

  function handleClick() {
    onSelect();
    navigate(campaignPath(campaign.handle));
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-elevated/60"
    >
      <span className="min-w-0 truncate text-foreground">{campaign.name}</span>
      <span className="shrink-0 text-xs text-muted">{meta}</span>
    </button>
  );
}
