import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { campaignDashboardPath, resolveCampaignLinkHandle } from '@/lib/campaignPaths';
import { leaveCampaign } from '@/lib/notifications';
import { membershipRoleUiLabel } from '@/types/domain';
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignMemberRole } from '@/types/domain';
import type { UserProfileCampaign } from '@/types/user';

function formatCampaignJoined(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Joined: Unknown';
  const formatted = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `Joined: ${formatted}`;
}

const ROLE_BADGE_CLASS: Record<CampaignMemberRole, string> = {
  [CampaignMemberRoles.GAMEMASTER]:
    'border-primary/50 bg-primary/15 text-primary',
  [CampaignMemberRoles.WRITER]:
    'border-primary/30 bg-primary/10 text-primary/90',
  [CampaignMemberRoles.PARTICIPANT]:
    'border-sky-500/40 bg-sky-500/15 text-sky-300',
  [CampaignMemberRoles.OBSERVER]:
    'border-border bg-elevated/80 text-muted font-medium',
};

export function CampaignRoleBadge({ role }: { role: CampaignMemberRole }) {
  const label = membershipRoleUiLabel(role);
  const tone = ROLE_BADGE_CLASS[role] ?? ROLE_BADGE_CLASS[CampaignMemberRoles.OBSERVER];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

export function CampaignMembershipRow({
  campaign,
  onLeft,
}: {
  campaign: UserProfileCampaign;
  onLeft: (campaignId: string) => void;
}) {
  const slug = resolveCampaignLinkHandle(campaign);
  const canLeave = campaign.role !== CampaignMemberRoles.GAMEMASTER;

  async function handleLeave(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = window.confirm(`Leave ${campaign.name}?`);
    if (!confirmed) return;
    try {
      await leaveCampaign(slug);
      onLeft(campaign.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to leave campaign.');
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/60 px-4 py-3">
      <Link
        to={campaignDashboardPath(slug)}
        className="min-w-0 flex-1 transition-colors hover:text-primary"
      >
        <p className="truncate font-medium text-foreground">{campaign.name}</p>
        <p className="text-xs text-muted">{formatCampaignJoined(campaign.joinedAt)}</p>
        <p className="truncate text-xs text-muted">/campaigns/{campaign.handle}</p>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <CampaignRoleBadge role={campaign.role} />
        {canLeave ? (
          <button
            type="button"
            onClick={(event) => void handleLeave(event)}
            className="min-h-11 px-2 text-xs text-muted hover:text-foreground"
          >
            Leave
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function computeCampaignMetrics(campaigns: UserProfileCampaign[]) {
  let dmCount = 0;
  let playerCount = 0;
  for (const membership of campaigns) {
    if (membership.role === CampaignMemberRoles.GAMEMASTER) dmCount += 1;
    if (membership.role === CampaignMemberRoles.PARTICIPANT) playerCount += 1;
  }
  return { dmCount, playerCount };
}
