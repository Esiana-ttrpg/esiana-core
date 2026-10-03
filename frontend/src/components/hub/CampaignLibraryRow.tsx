import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { CampaignSummary } from '@/types/campaign';
import { buildCampaignWorldPresentation } from '@/lib/buildCampaignWorldPresentation';
import { accentGlowShadow } from '@/lib/hubAmbientTheme';
import { campaignDashboardPath } from '@/lib/campaignPaths';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CampaignPinButton } from '@/components/hub/CampaignPinButton';
import { HubRoleMomentumMeta } from '@/components/hub/HubMomentumBadge';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface CampaignLibraryRowProps {
  campaign: CampaignSummary;
  pinned: boolean;
  onPinToggle: () => void;
}

export function CampaignLibraryRow({ campaign, pinned, onPinToggle }: CampaignLibraryRowProps) {
  const presentation = buildCampaignWorldPresentation(
    campaign,
    campaign.hubSignals?.arcIdentity,
  );
  const featuredOnHearth = campaign.hubSignals?.featuredOnHearth ?? false;
  const href = campaignDashboardPath(campaign.handle);
  const nextSession = campaign.hubSignals?.nextSession;
  const party = campaign.hubSignals?.partyPreview ?? [];
  const restingGlow = accentGlowShadow(presentation.accentColor, 0.08);

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-elevated/40 ${
        featuredOnHearth ? 'hub-hearth' : ''
      }`}
      style={
        {
          ...presentation.cardStyle,
          boxShadow: restingGlow,
          borderColor: `rgba(${presentation.accentRgb}, 0.28)`,
          borderLeftColor: presentation.accentColor,
          background: `color-mix(in srgb, rgba(${presentation.accentRgb}, 0.05) 35%, var(--color-depth-3, var(--color-focal-elevated)))`,
        } as CSSProperties
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {featuredOnHearth ? (
            <span className="hub-hearth__label shrink-0 text-[10px] uppercase tracking-wide">
              Hearth
            </span>
          ) : null}
          <h3 className={`truncate ${TYPE_DISPLAY_CLASS} !text-sm !font-medium`}>
            {presentation.arcTitle ?? campaign.name}
          </h3>
          {presentation.arcTitle ? (
            <span className="truncate text-xs text-muted">· {campaign.name}</span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <HubRoleMomentumMeta
            role={campaign.role}
            momentum={campaign.hubSignals?.momentum?.label}
          />
          {nextSession ? <span>Next {formatRelativeUpdated(nextSession.plannedStartAt)}</span> : null}
        </div>
      </div>

      {party.length > 0 ? (
        <div className="hidden shrink-0 -space-x-1.5 sm:flex">
          {party.slice(0, 4).map((m) => (
            <UserAvatar key={m.id} name={m.label} avatarUrl={m.avatarUrl} userId={m.id} size="sm" />
          ))}
        </div>
      ) : null}

      <CampaignPinButton pinned={pinned} onToggle={onPinToggle} className="!opacity-60 group-hover:!opacity-100" />

      <Link
        to={href}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium"
        style={{ color: 'var(--hub-accent)' }}
      >
        Open
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
