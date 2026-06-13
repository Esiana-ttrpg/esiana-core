import { FormEvent, useEffect, useState } from 'react';
import { Calendar, CalendarClock, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';
import { SessionDatesSection } from '@/components/campaign/SessionDatesSection';
import { fetchCampaign, updateCampaignSettings } from '@/lib/campaigns';
import { controlClasses } from '@/components/ui/formStyles';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';

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

export function SchedulingSettingsTab({ campaignHandle }: SchedulingSettingsTabProps) {
  const [activeSection, setActiveSection] = useState<
    'cadence' | 'sessionProgress' | 'sessionDates'
  >('cadence');
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [scheduleFrequency, setScheduleFrequency] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('');
  const [currentSession, setCurrentSession] = useState(0);
  const [sessionDuration, setSessionDuration] = useState('');
  const [estimatedLength, setEstimatedLength] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const campaign = await fetchCampaign(campaignHandle);
        if (cancelled) return;
        setCampaignId(campaign.id);
        setScheduleFrequency(campaign.scheduleFrequency ?? '');
        setScheduleDay(campaign.scheduleDay ?? '');
        setScheduleTime(campaign.scheduleTime ?? '');
        setScheduleTimezone(campaign.scheduleTimezone ?? '');
        setCurrentSession(campaign.currentSession ?? 0);
        setSessionDuration(campaign.sessionDuration ?? '');
        setEstimatedLength(campaign.estimatedLength ?? '');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load scheduling settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  async function handleSave(event: FormEvent) {
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
        scheduleFrequency: scheduleFrequency.trim() || null,
        scheduleDay: scheduleDay.trim() || null,
        scheduleTime: scheduleTime.trim() || null,
        scheduleTimezone: scheduleTimezone.trim() || null,
        currentSession: Number(currentSession) || 0,
        sessionDuration: sessionDuration.trim() || null,
        estimatedLength: estimatedLength.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scheduling settings.');
    } finally {
      setSaving(false);
    }
  }

  const sectionTabs = [
    { id: 'cadence' as const, label: 'Table cadence', icon: Calendar },
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
          Manage your table&apos;s recurring cadence, session progress, and per-session OOC dates.
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
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            {activeSection === 'cadence' ? (
              <>
                <SectionHeader
                  title="When you play"
                  description="Out-of-character schedule shown to applicants and party members."
                />
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
                  <p className="mt-1 text-xs text-muted">
                    Session times are authored in this timezone.
                  </p>
                </div>
              </>
            ) : null}

            {activeSection === 'sessionProgress' ? (
              <>
                <SectionHeader
                  title="Session progress"
                  description="Optional context for ongoing campaigns."
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Current session #</label>
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
                    <label className="mb-1 block text-xs text-muted">Campaign Length</label>
                    <input
                      type="text"
                      value={estimatedLength}
                      onChange={(e) => setEstimatedLength(e.target.value)}
                      placeholder="6 months"
                      className={controlClasses}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {error ? (
              <div className="rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded border border-emerald-700 bg-emerald-950/50 p-3 text-sm text-emerald-200">
                Scheduling settings saved.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
