import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Calendar, CalendarClock, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';
import { SessionDatesSection } from '@/components/campaign/SessionDatesSection';
import { ScheduleSessionModal } from '@/components/session/ScheduleSessionModal';
import { SkipSessionModal } from '@/components/session/SkipSessionModal';
import { fetchCampaign, updateCampaignSettings } from '@/lib/campaigns';
import {
  fetchCampaignSchedule,
  patchCampaignSchedule,
} from '@/lib/campaignSchedule';
import { controlClasses } from '@/components/ui/formStyles';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import type { UpcomingSessionSummary } from '@/types/notifications';

interface SchedulingSettingsTabProps {
  campaignHandle: string;
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/80 pb-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
    </div>
  );
}

function formatUpcomingLabel(upcoming: UpcomingSessionSummary): string {
  if (!upcoming.plannedStartAt) return upcoming.sessionTitle;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: upcoming.timezone ?? undefined,
  }).format(new Date(upcoming.plannedStartAt));
}

export function SchedulingSettingsTab({ campaignHandle }: SchedulingSettingsTabProps) {
  const [activeSection, setActiveSection] = useState<
    'sessionSchedule' | 'sessionProgress' | 'sessionDates'
  >('sessionSchedule');
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [scheduleFrequency, setScheduleFrequency] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('');
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [autoScheduleUpcomingSession, setAutoScheduleUpcomingSession] = useState(true);
  const [isOneShot, setIsOneShot] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingSessionSummary | null>(null);

  const [currentSession, setCurrentSession] = useState(0);
  const [sessionDuration, setSessionDuration] = useState('');
  const [estimatedLength, setEstimatedLength] = useState('');

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaign, schedulePayload] = await Promise.all([
        fetchCampaign(campaignHandle),
        fetchCampaignSchedule(campaignHandle),
      ]);
      setCampaignId(campaign.id);
      setScheduleFrequency(schedulePayload.schedule.frequency ?? '');
      setScheduleDay(schedulePayload.schedule.day ?? '');
      setScheduleTime(schedulePayload.schedule.time ?? '');
      setScheduleTimezone(schedulePayload.schedule.timezone ?? '');
      setSchedulingEnabled(schedulePayload.schedule.schedulingEnabled);
      setAutoScheduleUpcomingSession(schedulePayload.schedule.autoScheduleUpcomingSession);
      setIsOneShot(schedulePayload.schedule.isOneShot);
      setUpcoming(schedulePayload.upcoming);
      setCurrentSession(campaign.currentSession ?? 0);
      setSessionDuration(campaign.sessionDuration ?? '');
      setEstimatedLength(campaign.estimatedLength ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduling settings.');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSaveProgress(event: FormEvent) {
    event.preventDefault();
    if (!campaignId) {
      setError('Campaign is still loading. Please try again.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateCampaignSettings(campaignId, {
        currentSession: Number(currentSession) || 0,
        sessionDuration: sessionDuration.trim() || null,
        estimatedLength: estimatedLength.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session progress.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCadence(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await patchCampaignSchedule(campaignHandle, {
        scheduleFrequency: scheduleFrequency.trim() || null,
        scheduleDay: scheduleDay.trim() || null,
        scheduleTime: scheduleTime.trim() || null,
        scheduleTimezone: scheduleTimezone.trim() || null,
        schedulingEnabled,
        autoScheduleUpcomingSession: isOneShot ? false : autoScheduleUpcomingSession,
      });
      setUpcoming(result.upcoming);
      setSchedulingEnabled(result.schedule.schedulingEnabled);
      setAutoScheduleUpcomingSession(result.schedule.autoScheduleUpcomingSession);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoScheduleToggle(next: boolean) {
    if (isOneShot) return;
    setAutoScheduleUpcomingSession(next);
    setSaving(true);
    setError(null);
    try {
      const result = await patchCampaignSchedule(campaignHandle, {
        autoScheduleUpcomingSession: next,
        schedulingEnabled: schedulingEnabled || next,
      });
      setUpcoming(result.upcoming);
      setAutoScheduleUpcomingSession(result.schedule.autoScheduleUpcomingSession);
      setSchedulingEnabled(result.schedule.schedulingEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update automatic scheduling.');
      setAutoScheduleUpcomingSession(!next);
    } finally {
      setSaving(false);
    }
  }

  const sectionTabs = [
    { id: 'sessionSchedule' as const, label: 'Session schedule', icon: Calendar },
    { id: 'sessionProgress' as const, label: 'Session progress', icon: Clock },
    { id: 'sessionDates' as const, label: 'Session dates', icon: CalendarClock },
  ];

  if (loading) {
    return <LoadingSpinner label="Loading scheduling settings…" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Scheduling</h2>
        </div>
        <p className="mb-5 text-sm text-muted">
          Configure your table&apos;s recurring cadence and upcoming session. Dashboard and Session
          Notes use this same schedule.
        </p>

        <ResponsiveSectionNav
          sections={sectionTabs}
          activeId={activeSection}
          onChange={setActiveSection}
          ariaLabel="Scheduling settings sections"
          mobileLabel="Scheduling section"
        />

        {activeSection === 'sessionDates' ? (
          <div className="mt-6 space-y-4">
            <SectionHeader
              title="Session dates"
              description="Draft and publish OOC dates for individual sessions. The party is notified when a schedule is published."
            />
            <SessionDatesSection campaignHandle={campaignHandle} />
          </div>
        ) : null}

        {activeSection === 'sessionSchedule' ? (
          <form onSubmit={handleSaveCadence} className="mt-6 space-y-6">
            <SectionHeader
              title="Session schedule"
              description="Recurring cadence for this campaign."
            />

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={schedulingEnabled}
                onChange={(e) => setSchedulingEnabled(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-foreground">Scheduling enabled</span>
                <span className="block text-xs text-muted">
                  This campaign has a recurring table cadence.
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Frequency</label>
                <input
                  type="text"
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value)}
                  placeholder="Weekly"
                  className={controlClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Day</label>
                <input
                  type="text"
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(e.target.value)}
                  placeholder="Saturday"
                  className={controlClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Time</label>
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  placeholder="7:00 PM"
                  className={controlClasses}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor="campaign-schedule-timezone">
                Timezone
              </label>
              <TimezoneSelect
                id="campaign-schedule-timezone"
                value={scheduleTimezone}
                onChange={setScheduleTimezone}
                allowEmpty
                emptyLabel="Select timezone…"
              />
            </div>

            <div className="rounded-lg border border-border/80 bg-background/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Next session</p>
              {upcoming ? (
                <p className="mt-1 text-sm text-foreground">{formatUpcomingLabel(upcoming)}</p>
              ) : (
                <p className="mt-1 text-sm text-muted">No session scheduled</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
                >
                  {upcoming ? 'Edit schedule' : 'Schedule next session'}
                </button>
                {upcoming ? (
                  <button
                    type="button"
                    onClick={() => setSkipModalOpen(true)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
                  >
                    Skip session
                  </button>
                ) : null}
              </div>
            </div>

            {!isOneShot ? (
              <div className="rounded-lg border border-border/80 p-4">
                <p className="text-sm font-semibold text-foreground">Automatic scheduling</p>
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoScheduleUpcomingSession}
                    onChange={(e) => void handleAutoScheduleToggle(e.target.checked)}
                    disabled={saving}
                    className="mt-1"
                  />
                  <span>
                    Automatically schedule the next session
                    <span className="mt-0.5 block text-xs text-muted">
                      Creates the next session from your campaign&apos;s cadence after the current
                      session passes.
                    </span>
                  </span>
                </label>
              </div>
            ) : (
              <p className="text-xs text-muted">
                One-shot campaigns do not automatically schedule a follow-up session.
              </p>
            )}

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {success ? <p className="text-sm text-success">Saved.</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save cadence'}
            </button>
          </form>
        ) : null}

        {activeSection === 'sessionProgress' ? (
          <form onSubmit={handleSaveProgress} className="mt-6 space-y-6">
            <SectionHeader
              title="Session progress"
              description="Track how far into the campaign you are."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Current session</label>
                <input
                  type="number"
                  min={0}
                  value={currentSession}
                  onChange={(e) => setCurrentSession(Number(e.target.value))}
                  className={controlClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Session duration</label>
                <input
                  type="text"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  placeholder="3 hours"
                  className={controlClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Estimated length</label>
                <input
                  type="text"
                  value={estimatedLength}
                  onChange={(e) => setEstimatedLength(e.target.value)}
                  placeholder="12–20 sessions"
                  className={controlClasses}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {success ? <p className="text-sm text-success">Saved.</p> : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save progress'}
            </button>
          </form>
        ) : null}
      </div>

      <ScheduleSessionModal
        open={scheduleModalOpen}
        campaignHandle={campaignHandle}
        upcoming={upcoming}
        onClose={() => setScheduleModalOpen(false)}
        onSaved={() => void reload()}
      />

      {upcoming ? (
        <SkipSessionModal
          open={skipModalOpen}
          campaignHandle={campaignHandle}
          upcoming={upcoming}
          autoScheduleDefault={autoScheduleUpcomingSession}
          isOneShot={isOneShot}
          onClose={() => setSkipModalOpen(false)}
          onSkipped={() => void reload()}
        />
      ) : null}
    </div>
  );
}
