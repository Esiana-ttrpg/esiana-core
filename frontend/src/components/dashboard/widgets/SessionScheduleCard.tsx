import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DashboardSchedule } from '@/lib/dashboardConfig';
import type { DashboardSessionSummary } from '@/lib/dashboardSummary';
import { campaignNotePath, campaignSettingsPath } from '@/lib/campaignPaths';
import { patchMySessionAttendance } from '@/lib/notifications';
import type { SessionAttendanceStatus } from '@/types/notifications';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface SessionScheduleCardProps {
  campaignHandle: string;
  schedule: DashboardSchedule;
  nextSession: DashboardSessionSummary | null;
  canManageCampaign: boolean;
  customizeMode?: boolean;
  onHide?: () => void;
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
}: SessionScheduleCardProps) {
  const { t } = useTranslation();
  const [rsvp, setRsvp] = useState<SessionAttendanceStatus>('ATTENDING');
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => tick((v) => v + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const hasRecurringSchedule = Boolean(schedule.day && schedule.time);
  const showSchedulingCta =
    !nextSession && !hasRecurringSchedule && canManageCampaign && !customizeMode;

  const countdownLabel = useMemo(() => {
    if (nextSession?.plannedStartAt) {
      const when = new Date(nextSession.plannedStartAt);
      const campaignTz = schedule.timezone?.trim() || undefined;
      const localWhen = formatLocalTime(nextSession.plannedStartAt, undefined);
      const campaignWhen = campaignTz
        ? formatLocalTime(nextSession.plannedStartAt, campaignTz)
        : when.toLocaleString();
      const tzNote =
        campaignTz && localWhen !== campaignWhen
          ? ` (your time: ${localWhen})`
          : '';
      return `${formatCountdown(when)} until ${nextSession.title} — ${campaignWhen}${tzNote}`;
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
  }, [nextSession, schedule, canManageCampaign, hasRecurringSchedule, t, tick]);

  async function updateRsvp(next: SessionAttendanceStatus) {
    setRsvp(next);
    if (!nextSession?.timelinePointId || customizeMode) return;
    setRsvpBusy(true);
    try {
      await patchMySessionAttendance(campaignHandle, nextSession.timelinePointId, {
        status: next,
      });
    } finally {
      setRsvpBusy(false);
    }
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

        {showSchedulingCta ? (
          <Link
            to={campaignSettingsPath(campaignHandle, 'scheduling')}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('campaign.dashboard.sessionScheduleSetupLink')}
          </Link>
        ) : null}

        {nextSession ? (
          <Link
            to={campaignNotePath(campaignHandle, nextSession.timelinePointId)}
            className="text-xs text-primary hover:underline"
          >
            {t('campaign.dashboard.sessionScheduleOpenSession')}
          </Link>
        ) : null}

        {nextSession ? (
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
    </DashboardWidgetShell>
  );
}
