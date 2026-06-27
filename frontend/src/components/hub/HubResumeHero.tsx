import type { CSSProperties } from 'react';
import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { ArrowRight } from 'lucide-react';
import type { HubContinueCandidate, HubUpcomingChip } from '@/types/hub';
import { buildCampaignWorldPresentation } from '@/lib/buildCampaignWorldPresentation';
import { accentGlowShadow } from '@/lib/hubAmbientTheme';
import { CampaignPinButton } from '@/components/hub/CampaignPinButton';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import { HubActionButton } from '@/components/hub/HubActionButton';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface HubResumeHeroProps {
  heroes: HubContinueCandidate[];
  upcomingChips: HubUpcomingChip[];
  pinnedCampaignIds: string[];
  onPinToggle: (campaignId: string, pinned: boolean) => void;
}

function formatChipTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ResumePanel({
  candidate,
  pinned,
  onPinToggle,
  fullWidth,
}: {
  candidate: HubContinueCandidate;
  pinned: boolean;
  onPinToggle: () => void;
  fullWidth?: boolean;
}) {
  const { campaign, ctaLabel, ctaHref, reason } = candidate;
  const presentation = buildCampaignWorldPresentation(
    campaign,
    campaign.hubSignals?.arcIdentity,
  );
  const nextSession = campaign.hubSignals?.nextSession;
  const bullets = presentation.continuityLines.slice(0, 3);
  const hoverGlow = accentGlowShadow(presentation.accentColor, 0.2);

  return (
    <div
      className={`hub-resume-card group relative overflow-hidden rounded-xl border border-border/80 bg-surface shadow-lg ${
        fullWidth ? 'min-h-[220px]' : 'min-w-[300px] flex-1 sm:min-w-0'
      }`}
      style={
        {
          '--card-accent-rgb': presentation.accentColor,
        } as CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = hoverGlow;
        e.currentTarget.style.borderColor = `${presentation.accentColor}50`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = '';
      }}
    >
      <div className="absolute inset-0" style={presentation.backdropStyle} />
      <div className="absolute inset-0" style={presentation.overlayStyle} />
      <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
        <div className="absolute right-3 top-3">
          <CampaignPinButton pinned={pinned} onToggle={onPinToggle} className="!opacity-70 group-hover:!opacity-100" />
        </div>
        <p className={META_SECTION_LABEL_CLASS}>
          {campaign.name}
        </p>
        {presentation.arcTitle ? (
          <h3 className={`mt-1 ${TYPE_DISPLAY_CLASS}`}>
            {presentation.arcTitle}
          </h3>
        ) : (
          <h3 className={`mt-1 ${TYPE_DISPLAY_CLASS}`}>{campaign.name}</h3>
        )}
        {presentation.tensionLine ? (
          <p className="mt-2 line-clamp-2 text-sm italic text-foreground/85">
            {presentation.tensionLine}
          </p>
        ) : null}
        <ul className="mt-3 space-y-1">
          {nextSession ? (
            <li className="text-xs text-foreground/90">
              Session {nextSession.title} ·{' '}
              {formatRelativeUpdated(nextSession.plannedStartAt)}
            </li>
          ) : null}
          {bullets.map((line, index) => (
            <li key={`continuity-${index}`} className="text-xs text-muted">
              {line}
            </li>
          ))}
          {!bullets.length && reason ? (
            <li className="text-xs text-muted">{reason}</li>
          ) : null}
        </ul>
        <HubActionButton variant="narrative" to={ctaHref} className="mt-4 w-fit">
          {ctaLabel}
          <ArrowRight className="size-4" />
        </HubActionButton>
      </div>
    </div>
  );
}

export function HubResumeHero({
  heroes,
  upcomingChips,
  pinnedCampaignIds,
  onPinToggle,
}: HubResumeHeroProps) {
  if (heroes.length === 0) return null;

  return (
    <section className="space-y-3">
      <HubSectionHeader
        title="Resume Your Story"
        subtitle="Pick up where your worlds left off."
        variant="resume"
      />

      <div
        className={
          heroes.length === 1
            ? 'grid gap-4'
            : 'flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-2 xl:grid-cols-4 lg:overflow-visible'
        }
      >
        {heroes.map((candidate) => (
          <div key={candidate.campaign.id} className="snap-start lg:snap-align-none">
            <ResumePanel
              candidate={candidate}
              pinned={pinnedCampaignIds.includes(candidate.campaign.id)}
              onPinToggle={() =>
                onPinToggle(
                  candidate.campaign.id,
                  pinnedCampaignIds.includes(candidate.campaign.id),
                )
              }
              fullWidth={heroes.length === 1}
            />
          </div>
        ))}
      </div>

      {upcomingChips.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {upcomingChips.map((chip) => (
            <HubActionButton
              key={`${chip.campaignId}-${chip.plannedStartAt}`}
              variant="utility"
              to={chip.href}
              className="!rounded-full !px-3 !py-1 !text-xs"
            >
              <span className="font-medium">{chip.campaignName}</span>
              <span className="text-muted">·</span>
              <span>{formatChipTime(chip.plannedStartAt)}</span>
              {chip.needsRsvp ? (
                <span className="hub-chip hub-chip--active !px-1.5 !py-0.5 !text-[10px]">
                  RSVP
                </span>
              ) : null}
            </HubActionButton>
          ))}
        </div>
      ) : null}
    </section>
  );
}
