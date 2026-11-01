import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dashboardSessionState } from '@shared/dashboardSessions';
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DashboardSchedule } from '@/lib/dashboardConfig';
import type { DashboardSessionSummary } from '@/lib/dashboardSummary';
import { campaignNotePath, campaignSettingsPath } from '@/lib/campaignPaths';
import { patchMySessionAttendance } from '@/lib/notifications';
import { fetchCampaignSchedule } from '@/lib/campaignSchedule';
import { ScheduleSessionModal } from '@/components/session/ScheduleSessionModal';
import { SkipSessionModal } from '@/components/session/SkipSessionModal';
import type { SessionAttendanceStatus } from '@/types/notifications';
import type { UpcomingSessionSummary } from '@/types/notifications';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import { DashboardPresentationContext, DashboardWidgetShell } from '../DashboardWidgetShell';

interface SessionScheduleCardProps {
  campaignHandle: string;
  schedule: DashboardSchedule;
  nextSession: DashboardSessionSummary | null;
  canManageCampaign: boolean;
  customizeMode?: boolean;
  onHide?: () => void;
  onScheduleChanged?: () => void;
}

function formatCountdown(target: Date): string {
  const diffMs = Math.max(0, target.getTime() - Date.now());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function safeTimeZone(value?: string | null): string | undefined {
  const zone = value?.trim();
  if (!zone) return undefined;
  try { new Intl.DateTimeFormat(undefined, { timeZone: zone }); return zone; }
  catch { return undefined; }
}

function formatLocalTime(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(iso));
}

export function SessionScheduleCard({
  campaignHandle,
  schedule,
  nextSession,
  canManageCampaign,
  customizeMode,
  onHide,
  onScheduleChanged,
}: SessionScheduleCardProps) {
  const { t } = useTranslation();
  const [rsvp, setRsvp] = useState<SessionAttendanceStatus>('ATTENDING');
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const { variant } = useContext(DashboardPresentationContext);
  const [upcoming, setUpcoming] = useState<UpcomingSessionSummary | null>(null);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [isOneShot, setIsOneShot] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);

  const reloadSchedule = useCallback(() => {
    if (!canManageCampaign) return;
    void fetchCampaignSchedule(campaignHandle)
      .then((payload) => {
        setUpcoming(payload.upcoming);
        setScheduleLoaded(true);
        setAutoSchedule(payload.schedule.autoScheduleUpcomingSession);
        setIsOneShot(payload.schedule.isOneShot);
      })
      .catch(() => {
        setUpcoming(null);
        setScheduleLoaded(false);
      });
  }, [campaignHandle, canManageCampaign]);

  useEffect(() => {
    reloadSchedule();
  }, [reloadSchedule, nextSession?.timelinePointId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const fallback = nextSession
    ? {
        timelinePointId: nextSession.timelinePointId,
        sessionTitle: nextSession.title,
        sequenceOrder: nextSession.sequenceOrder ?? 0,
        status: nextSession.status ?? 'PUBLISHED',
        plannedStartAt: nextSession.plannedStartAt,
        plannedEndAt: nextSession.plannedEndAt ?? null,
        timezone: nextSession.timezone ?? schedule.timezone ?? null,
        venueType: nextSession.venueType ?? null,
        venueLabel: nextSession.venueLabel ?? null,
        venueUrl: null,
        locationPageId: null,
        reminderSentAt: null,
        publishedAt: null,
        origin: 'MANUAL',
        skipReason: null,
        plannedWorldEpochMinute: null,
      }
    : null;
  const refreshedUpcoming = upcoming && fallback?.timelinePointId === upcoming.timelinePointId ? {
    ...fallback, ...upcoming,
    venueLabel: upcoming.venueLabel ?? fallback.venueLabel,
    venueType: upcoming.venueType ?? fallback.venueType,
  } : upcoming;
  const effectiveNext = canManageCampaign && scheduleLoaded
    ? (fallback && dashboardSessionState(fallback, now) === 'ongoing' ? fallback : refreshedUpcoming)
    : fallback;

  /** Only fetched upcoming may drive edit/skip (never synthesized dashboard fallback). */
  const editableUpcoming =
    upcoming && upcoming.status === 'PUBLISHED' && upcoming.timelinePointId === effectiveNext?.timelinePointId ? upcoming : null;

  const state = effectiveNext ? dashboardSessionState(effectiveNext, now) : null;
  const isSkipped = state === 'skipped';
  const canRsvp = state === 'scheduled' || state === 'ongoing';
  const start = effectiveNext?.plannedStartAt ? new Date(effectiveNext.plannedStartAt) : null;
  const validStart = start && Number.isFinite(start.getTime()) ? start : null;
  const locationTitle = effectiveNext?.timelinePointId === nextSession?.timelinePointId ? nextSession?.locationTitle : null;
  const timeZone = safeTimeZone(effectiveNext?.timezone ?? schedule.timezone);
  const datePart = (options: Intl.DateTimeFormatOptions) => validStart
    ? new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(validStart) : '';

  const hasRecurringSchedule = Boolean(schedule.day && schedule.time);
  const showSchedulingCta =
    !effectiveNext && !hasRecurringSchedule && canManageCampaign && !customizeMode;

  const countdownLabel = useMemo(() => {
    if (state === 'completed') return 'Completed';
    if (state === 'cancelled') return 'Cancelled';
    if (state === 'draft') return 'Draft schedule';
    if (state === 'ongoing') return 'In progress';
    if (isSkipped && effectiveNext) {
      const reason = effectiveNext.skipReason?.trim();
      return reason ? `Skipped · ${reason}` : 'Skipped';
    }
    if (effectiveNext?.plannedStartAt) {
      const when = new Date(effectiveNext.plannedStartAt);
      if (!Number.isFinite(when.getTime())) return 'Session date unavailable';
      if (when.getTime() <= now) return 'Scheduled start has passed';
      const campaignTz = effectiveNext.timezone ?? schedule.timezone?.trim() ?? undefined;
      const localWhen = formatLocalTime(effectiveNext.plannedStartAt, undefined);
      const campaignWhen = campaignTz
        ? formatLocalTime(effectiveNext.plannedStartAt, campaignTz)
        : when.toLocaleString();
      const tzNote =
        campaignTz && localWhen !== campaignWhen
          ? ` (your time: ${localWhen})`
          : '';
      let label = `Starts in ${formatCountdown(when)}${tzNote}`;
      if (effectiveNext.plannedWorldEpochMinute) {
        label += ' · Planned world start set';
      }
      return label;
    }
    if (hasRecurringSchedule) {
      const freq = schedule.frequency ? `${schedule.frequency} · ` : '';
      const tz = schedule.timezone ? ` ${schedule.timezone}` : '';
      return `${freq}${schedule.day} at ${schedule.time}${tz}`;
    }
    if (canManageCampaign) {
      return t('campaign.dashboard.sessionScheduleGmEmpty');
    }
    return t('campaign.dashboard.sessionSchedulePlayerEmpty');
  }, [
    effectiveNext,
    schedule,
    canManageCampaign,
    hasRecurringSchedule,
    t,
    now,
    state,
    isSkipped,
    nextSession?.title,
  ]);

  async function updateRsvp(next: SessionAttendanceStatus) {
    setRsvp(next);
    if (!effectiveNext?.timelinePointId || customizeMode || !canRsvp) return;
    setRsvpBusy(true);
    try {
      await patchMySessionAttendance(campaignHandle, effectiveNext.timelinePointId, {
        status: next,
      });
    } finally {
      setRsvpBusy(false);
    }
  }

  function handleScheduleSaved() {
    reloadSchedule();
    onScheduleChanged?.();
  }

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('sessionSchedule', 'Session Schedule')}
      icon={<CalendarClock className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <div className="space-y-3" data-session-state={state ?? 'empty'}>
        <div className="flex min-w-0 items-start gap-4">
        {validStart ? <div className="shrink-0 rounded-lg bg-elevated px-3 py-2 text-center" aria-label={datePart({ dateStyle: 'full' })}>
          <p className="text-xs text-muted">{datePart({ month: 'short' })}</p>
          <p className={`type-prose font-semibold leading-tight text-foreground ${variant === 'featured' ? 'text-4xl' : 'text-3xl'}`}>{datePart({ day: 'numeric' })}</p>
          <p className="mt-1 text-xs text-muted">{datePart({ hour: 'numeric', minute: '2-digit' })}</p>
        </div> : null}
        <div className="min-w-0 flex-1 space-y-2">
        {effectiveNext ? <div className="space-y-1">
          {effectiveNext.sequenceOrder > 0 ? <p className="text-xs text-muted">Session {effectiveNext.sequenceOrder}</p> : null}
          <p className="break-words text-base font-semibold leading-snug text-foreground">{effectiveNext.sessionTitle || nextSession?.title || 'Next session'}</p>
        </div> : null}
        <p className="text-sm leading-relaxed text-muted">{countdownLabel}</p>
        {effectiveNext?.venueLabel ? <p className="text-sm text-muted">{effectiveNext.venueLabel}</p> : null}
        {locationTitle && locationTitle !== effectiveNext?.venueLabel ? <p className="text-sm text-muted">{locationTitle}</p> : null}
        {validStart && timeZone ? <p className="text-xs text-muted">{timeZone}</p> : null}
        </div>
        </div>

        {showSchedulingCta || (!effectiveNext && canManageCampaign && !customizeMode) ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Schedule next session
            </button>
            <Link
              to={campaignSettingsPath(campaignHandle, 'scheduling')}
              className="text-sm text-muted hover:underline"
            >
              {t('campaign.dashboard.sessionScheduleSetupLink')}
            </Link>
          </div>
        ) : null}

        {effectiveNext ? (
          <Link
            to={campaignNotePath(campaignHandle, effectiveNext.timelinePointId)}
            className="text-xs text-primary hover:underline"
          >
            {t('campaign.dashboard.sessionScheduleOpenSession')}
          </Link>
        ) : null}

        {editableUpcoming && canManageCampaign && !customizeMode ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Edit schedule
            </button>
            <button
              type="button"
              onClick={() => setSkipModalOpen(true)}
              className="text-xs font-medium text-muted hover:underline"
            >
              Skip session
            </button>
          </div>
        ) : null}

        {effectiveNext && canRsvp && variant !== 'compact' ? (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['ATTENDING', 'Attending'],
                ['ABSENT', 'Absent'],
                ['LATE', 'Late'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={rsvpBusy || customizeMode}
                onClick={() => void updateRsvp(value)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  rsvp === value
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-background/60 text-muted hover:border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ScheduleSessionModal
        open={scheduleModalOpen}
        campaignHandle={campaignHandle}
        upcoming={editableUpcoming}
        onClose={() => setScheduleModalOpen(false)}
        onSaved={handleScheduleSaved}
      />

      {editableUpcoming ? (
        <SkipSessionModal
          open={skipModalOpen}
          campaignHandle={campaignHandle}
          upcoming={editableUpcoming}
          autoScheduleDefault={autoSchedule}
          isOneShot={isOneShot}
          onClose={() => setSkipModalOpen(false)}
          onSkipped={handleScheduleSaved}
        />
      ) : null}
    </DashboardWidgetShell>
  );
}
