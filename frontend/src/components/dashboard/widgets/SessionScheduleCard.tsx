import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DashboardWidgetShell } from '../DashboardWidgetShell';

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

function formatLocalTime(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone ?? undefined,
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
  const [, tick] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingSessionSummary | null>(null);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [isOneShot, setIsOneShot] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);

  const reloadSchedule = useCallback(() => {
    void fetchCampaignSchedule(campaignHandle)
      .then((payload) => {
        setUpcoming(payload.upcoming);
        setAutoSchedule(payload.schedule.autoScheduleUpcomingSession);
        setIsOneShot(payload.schedule.isOneShot);
      })
      .catch(() => {
        setUpcoming(null);
      });
  }, [campaignHandle]);

  useEffect(() => {
    reloadSchedule();
  }, [reloadSchedule, nextSession?.timelinePointId]);

  useEffect(() => {
    const interval = window.setInterval(() => tick((v) => v + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const effectiveNext = upcoming ?? (nextSession
    ? {
        timelinePointId: nextSession.timelinePointId,
        sessionTitle: nextSession.title,
        sequenceOrder: nextSession.sequenceOrder ?? 0,
        status: 'PUBLISHED',
        plannedStartAt: nextSession.plannedStartAt,
        plannedEndAt: null,
        timezone: schedule.timezone ?? null,
        venueType: null,
        venueLabel: null,
        venueUrl: null,
        locationPageId: null,
        reminderSentAt: null,
        publishedAt: null,
        origin: 'MANUAL',
        skipReason: null,
        plannedWorldEpochMinute: null,
      }
    : null);

  const isSkipped = effectiveNext?.status === 'SKIPPED';

  const hasRecurringSchedule = Boolean(schedule.day && schedule.time);
  const showSchedulingCta =
    !effectiveNext && !hasRecurringSchedule && canManageCampaign && !customizeMode;

  const countdownLabel = useMemo(() => {
    if (isSkipped && effectiveNext) {
      const reason = effectiveNext.skipReason?.trim();
      return reason ? `Skipped · ${reason}` : 'Skipped';
    }
    if (effectiveNext?.plannedStartAt) {
      const when = new Date(effectiveNext.plannedStartAt);
      const campaignTz = schedule.timezone?.trim() || undefined;
      const localWhen = formatLocalTime(effectiveNext.plannedStartAt, undefined);
      const campaignWhen = campaignTz
        ? formatLocalTime(effectiveNext.plannedStartAt, campaignTz)
        : when.toLocaleString();
      const tzNote =
        campaignTz && localWhen !== campaignWhen
          ? ` (your time: ${localWhen})`
          : '';
      const title = effectiveNext.sessionTitle || nextSession?.title || 'Next session';
      let label = `${formatCountdown(when)} until ${title} — ${campaignWhen}${tzNote}`;
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
    tick,
    isSkipped,
    nextSession?.title,
  ]);

  async function updateRsvp(next: SessionAttendanceStatus) {
    setRsvp(next);
    if (!effectiveNext?.timelinePointId || customizeMode || isSkipped) return;
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
      <div className="space-y-4">
        <p className="text-base font-semibold leading-snug text-primary">{countdownLabel}</p>

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

        {effectiveNext && !isSkipped ? (
          <Link
            to={campaignNotePath(campaignHandle, effectiveNext.timelinePointId)}
            className="text-xs text-primary hover:underline"
          >
            {t('campaign.dashboard.sessionScheduleOpenSession')}
          </Link>
        ) : null}

        {effectiveNext && canManageCampaign && !customizeMode && !isSkipped ? (
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

        {effectiveNext && !isSkipped ? (
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
        upcoming={effectiveNext && !isSkipped ? effectiveNext : null}
        onClose={() => setScheduleModalOpen(false)}
        onSaved={handleScheduleSaved}
      />

      {effectiveNext && !isSkipped ? (
        <SkipSessionModal
          open={skipModalOpen}
          campaignHandle={campaignHandle}
          upcoming={effectiveNext}
          autoScheduleDefault={autoSchedule}
          isOneShot={isOneShot}
          onClose={() => setSkipModalOpen(false)}
          onSkipped={handleScheduleSaved}
        />
      ) : null}
    </DashboardWidgetShell>
  );
}
