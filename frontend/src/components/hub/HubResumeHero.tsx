import { useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Calendar } from 'lucide-react';
import type { HubContinueCandidate, HubUpcomingChip } from '@/types/hub';
import { buildCampaignWorldPresentation } from '@/lib/buildCampaignWorldPresentation';
import { campaignDashboardPath } from '@/lib/campaignPaths';
import { CampaignPinButton } from '@/components/hub/CampaignPinButton';
import { CampaignArtworkPreviewButton } from '@/components/hub/CampaignArtworkPreviewButton';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';
import { HubActionButton } from '@/components/hub/HubActionButton';
import {
  HubResumeSessionPopover,
  type HubSessionInteractionMode,
} from '@/components/hub/HubResumeSessionPopover';

interface HubResumeHeroProps {
  heroes: HubContinueCandidate[];
  upcomingChips: HubUpcomingChip[];
  pinnedCampaignIds: string[];
  onPinToggle: (campaignId: string, pinned: boolean) => void;
  onHubRefresh?: () => void;
}

const RESUME_MAX = 3;
/** Landscape Resume cards (~1.6:1) — independent from Library geometry. */
const RESUME_CARD_GEOMETRY = 'aspect-[8/5] w-full';

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

function formatSessionWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function needsAttendanceAction(candidate: HubContinueCandidate): boolean {
  return Boolean(candidate.campaign.hubSignals?.pendingActions?.some((a) => a.type === 'RSVP'));
}

/** Current/recent window: 2h before start through 6h after → check-in copy. */
function resolveSessionMode(plannedStartAt: string): HubSessionInteractionMode {
  const start = new Date(plannedStartAt).getTime();
  if (Number.isNaN(start)) return 'rsvp';
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;
  const sixHours = 6 * 60 * 60 * 1000;
  if (now >= start - twoHours && now <= start + sixHours) return 'checkin';
  return 'rsvp';
}

function formatSessionControlLabel(title: string, plannedStartAt: string): string {
  const when = formatSessionWhen(plannedStartAt);
  const trimmed = title.trim();
  if (!trimmed) return when;
  return when ? `${trimmed} · ${when}` : trimmed;
}

function resolveTagline(
  tensionLine: string | null,
  arcTitle: string | null,
  campaignName: string,
): string | null {
  if (tensionLine) return tensionLine;
  if (arcTitle && arcTitle.trim().toLocaleLowerCase() !== campaignName.trim().toLocaleLowerCase()) {
    return arcTitle;
  }
  return null;
}

function ResumePanel({
  candidate,
  pinned,
  onPinToggle,
  onHubRefresh,
}: {
  candidate: HubContinueCandidate;
  pinned: boolean;
  onPinToggle: () => void;
  onHubRefresh?: () => void;
}) {
  const { campaign } = candidate;
  const enterHref = campaignDashboardPath(campaign.handle);
  const presentation = buildCampaignWorldPresentation(
    campaign,
    campaign.hubSignals?.arcIdentity,
  );
  const nextSession = campaign.hubSignals?.nextSession;
  const tagline = resolveTagline(
    presentation.tensionLine,
    presentation.arcTitle,
    campaign.name,
  );
  const actionNeeded = needsAttendanceAction(candidate);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [actionCleared, setActionCleared] = useState(false);
  const sessionAnchorRef = useRef<HTMLButtonElement>(null);
  const showAction = actionNeeded && !actionCleared && Boolean(nextSession);
  const mode = nextSession ? resolveSessionMode(nextSession.plannedStartAt) : 'rsvp';

  return (
    <div
      className={`hub-resume-card group relative overflow-hidden rounded-xl border ${RESUME_CARD_GEOMETRY}`}
      style={
        {
          ...presentation.cardStyle,
          borderColor: `rgba(${presentation.accentRgb}, 0.2)`,
          borderLeftWidth: 2,
          '--card-accent-rgb': presentation.accentRgb,
        } as CSSProperties
      }
    >
      {/* Stretched primary link: entire card enters the campaign */}
      <Link
        to={enterHref}
        className="hub-resume-card__link absolute inset-0 z-[1]"
        aria-label={`Enter ${campaign.name}`}
      />

      <div
        className="hub-resume-card__art absolute inset-0"
        style={presentation.backdropStyle}
        aria-hidden
      />
      <div className="absolute inset-0" style={presentation.overlayStyle} aria-hidden />

      <div className="hub-art-surface pointer-events-none relative z-[2] flex h-full flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="pointer-events-auto absolute right-3 top-3 z-[3] flex items-center gap-1.5">
          {presentation.coverUrl ? (
            <CampaignArtworkPreviewButton
              src={presentation.coverUrl}
              alt={`${campaign.name} artwork`}
              className="!opacity-50 group-hover:!opacity-90 group-focus-within:!opacity-90"
            />
          ) : null}
          <CampaignPinButton
            pinned={pinned}
            onToggle={onPinToggle}
            className="!opacity-50 group-hover:!opacity-90 group-focus-within:!opacity-90"
          />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col justify-end pb-3">
          <div className="max-w-[95%]">
            <div className="hub-resume-title-slot">
              <h3
                className={`${TYPE_DISPLAY_CLASS} hub-art-fg line-clamp-2 !text-[clamp(1.25rem,2.1vw,1.65rem)] !font-semibold !leading-snug`}
              >
                {campaign.name}
              </h3>
            </div>
            {tagline ? (
              <p
                className="hub-art-muted mt-1.5 line-clamp-1 text-sm font-normal italic leading-snug opacity-85"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {tagline}
              </p>
            ) : (
              <div className="hub-resume-tagline-slot mt-1.5" aria-hidden />
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <div className="hub-resume-session relative min-h-[1.25rem]">
            {nextSession ? (
              <>
                <button
                  ref={sessionAnchorRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSessionOpen((v) => !v);
                  }}
                  className={`hub-resume-session__control pointer-events-auto relative z-[3] flex max-w-full items-center gap-1.5 rounded-sm text-left text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring-color,var(--hub-accent))] ${
                    showAction
                      ? 'hub-resume-session__control--action'
                      : 'hub-resume-session__control--quiet'
                  }`}
                >
                  <Calendar className="size-3.5 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0 truncate">
                    {formatSessionControlLabel(nextSession.title, nextSession.plannedStartAt)}
                    {showAction ? (
                      <span className="hub-resume-session__action-hint">
                        {' '}
                        · {mode === 'checkin' ? 'Check in' : 'RSVP needed'}
                      </span>
                    ) : null}
                  </span>
                </button>
                <HubResumeSessionPopover
                  open={sessionOpen}
                  onClose={() => setSessionOpen(false)}
                  campaignHandle={campaign.handle}
                  sessionTitle={nextSession.title || 'Session'}
                  plannedStartAt={nextSession.plannedStartAt}
                  timelinePointId={nextSession.timelinePointId}
                  mode={mode}
                  anchorRef={sessionAnchorRef}
                  onCompleted={() => {
                    setActionCleared(true);
                    onHubRefresh?.();
                  }}
                />
              </>
            ) : (
              <span className="hub-resume-session__empty inline-flex items-center gap-1.5 text-xs">
                <Calendar className="size-3.5 shrink-0 opacity-60" strokeWidth={1.5} aria-hidden />
                No session scheduled
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HubResumeHero({
  heroes,
  upcomingChips,
  pinnedCampaignIds,
  onPinToggle,
  onHubRefresh,
}: HubResumeHeroProps) {
  const visible = heroes.slice(0, RESUME_MAX);
  if (visible.length === 0) return null;

  const railClass =
    visible.length === 1
      ? 'grid max-w-2xl gap-4'
      : visible.length === 2
        ? 'grid gap-4 sm:grid-cols-2'
        : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <section className="hub-section-surface space-y-3">
      <HubSectionHeader
        title="Resume Your Story"
        subtitle="Pick up where your worlds left off."
        variant="resume"
      />

      <div className={railClass}>
        {visible.map((candidate) => (
          <ResumePanel
            key={candidate.campaign.id}
            candidate={candidate}
            pinned={pinnedCampaignIds.includes(candidate.campaign.id)}
            onPinToggle={() =>
              onPinToggle(
                candidate.campaign.id,
                pinnedCampaignIds.includes(candidate.campaign.id),
              )
            }
            onHubRefresh={onHubRefresh}
          />
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
                <span className="hub-chip hub-chip--severity-soft !px-1.5 !py-0.5 !text-[10px]">
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
