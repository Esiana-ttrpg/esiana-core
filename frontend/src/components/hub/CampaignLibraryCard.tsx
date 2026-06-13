import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { CampaignSummary } from '@/types/campaign';
import type { ResolvedShelfDensity } from '@/lib/hubDensityPreference';
import { buildCampaignWorldPresentation } from '@/lib/buildCampaignWorldPresentation';
import { accentGlowShadow } from '@/lib/hubAmbientTheme';
import { campaignDashboardPath } from '@/lib/campaignPaths';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CampaignPinButton } from '@/components/hub/CampaignPinButton';
import { HubRoleMomentumMeta } from '@/components/hub/HubMomentumBadge';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface CampaignLibraryCardProps {
  campaign: CampaignSummary;
  density: ResolvedShelfDensity;
  pinned: boolean;
  onPinToggle: () => void;
}

export function CampaignLibraryCard({
  campaign,
  density,
  pinned,
  onPinToggle,
}: CampaignLibraryCardProps) {
  const presentation = buildCampaignWorldPresentation(
    campaign,
    campaign.hubSignals?.arcIdentity,
  );
  const featuredOnHearth = campaign.hubSignals?.featuredOnHearth ?? false;
  const effectiveDensity = featuredOnHearth && density === 'cinematic' ? 'shelf' : density;
  const bannerHeight =
    effectiveDensity === 'cinematic' ? 'h-28' : effectiveDensity === 'shelf' ? 'h-16' : 'h-12';
  const href = campaignDashboardPath(campaign.handle);
  const nextSession = campaign.hubSignals?.nextSession;
  const party = campaign.hubSignals?.partyPreview ?? [];
  const hoverGlow = accentGlowShadow(presentation.accentColor, 0.18);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-surface transition-all ${
        featuredOnHearth ? 'hub-hearth border-border' : 'border-border hover:border-border/80'
      } ${effectiveDensity === 'ledger' ? 'flex flex-row' : 'flex flex-col'}`}
      style={
        {
          borderLeftColor: presentation.accentColor,
          borderLeftWidth: 3,
          '--card-accent': presentation.accentColor,
        } as CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = hoverGlow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <Link
        to={href}
        className={`relative shrink-0 overflow-hidden ${bannerHeight} ${
          effectiveDensity === 'ledger' ? 'w-2' : 'w-full'
        }`}
        style={effectiveDensity !== 'ledger' ? presentation.backdropStyle : { backgroundColor: presentation.accentColor }}
      >
        {effectiveDensity !== 'ledger' ? (
          <div className="absolute inset-0" style={presentation.overlayStyle} />
        ) : null}
      </Link>

      <div className={`flex flex-1 flex-col p-3 ${effectiveDensity === 'ledger' ? 'py-2' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {featuredOnHearth ? (
              <span className="hub-hearth__label text-[10px] font-medium uppercase tracking-wide">
                On the Hearth
              </span>
            ) : null}
            {presentation.arcTitle ? (
              <h3 className="truncate font-semibold text-foreground group-hover:[color:var(--card-accent)]">
                {presentation.arcTitle}
              </h3>
            ) : null}
            <p className={`truncate text-foreground/90 ${presentation.arcTitle ? 'text-xs text-muted' : 'font-semibold'}`}>
              {campaign.name}
            </p>
          </div>
          <CampaignPinButton pinned={pinned} onToggle={onPinToggle} />
        </div>

        {presentation.tensionLine && effectiveDensity !== 'ledger' ? (
          <p className="mt-1 line-clamp-1 text-xs italic text-muted">{presentation.tensionLine}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <HubRoleMomentumMeta
            role={campaign.role}
            momentum={campaign.hubSignals?.momentum?.label}
          />
          {nextSession ? (
            <span>Next: {formatRelativeUpdated(nextSession.plannedStartAt)}</span>
          ) : null}
        </div>

        {party.length > 0 && effectiveDensity === 'cinematic' ? (
          <div className="mt-2 flex -space-x-2">
            {party.slice(0, 5).map((m) => (
              <UserAvatar
                key={m.id}
                name={m.label}
                avatarUrl={m.avatarUrl}
                userId={m.id}
                size="sm"
              />
            ))}
          </div>
        ) : null}

        <Link
          to={href}
          className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-medium"
          style={{ color: 'var(--hub-accent)' }}
        >
          Open Campaign
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
