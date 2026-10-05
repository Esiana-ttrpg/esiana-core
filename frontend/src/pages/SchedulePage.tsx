import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { ScheduleSettingsBar } from '@/components/schedule/ScheduleSettingsBar';
import { VacationModal } from '@/components/schedule/VacationModal';
import { UpcomingSessionsList } from '@/components/schedule/UpcomingSessionsList';
import { ScheduleMonthCalendar } from '@/components/schedule/ScheduleMonthCalendar';
import { SessionCalendarAccess } from '@/components/schedule/SessionCalendarAccess';
import {
  fetchUserSchedule,
  monthGridRange,
  patchUserSchedulePreferences,
} from '@/lib/userSchedule';
import type {
  MaterializedScheduleEntry,
  UserScheduleEntry,
  UserSchedulePreferences,
} from '@/types/userSchedule';

export function SchedulePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [preferences, setPreferences] = useState<UserSchedulePreferences | null>(null);
  const [entries, setEntries] = useState<UserScheduleEntry[]>([]);
  const [upcoming, setUpcoming] = useState<MaterializedScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vacationOpen, setVacationOpen] = useState(false);
  const loadRequestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const range = monthGridRange(year, monthIndex);
      const data = await fetchUserSchedule(range);
      if (requestId !== loadRequestIdRef.current) return;
      setPreferences(data.preferences);
      setEntries(data.entries);
      setUpcoming(data.upcoming);
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load schedule.');
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [year, monthIndex]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [isAuthenticated, load]);

  async function updatePrefs(
    patch: Parameters<typeof patchUserSchedulePreferences>[0],
  ) {
    setPrefsSaving(true);
    try {
      const data = await patchUserSchedulePreferences(patch);
      setPreferences(data.preferences);
    } finally {
      setPrefsSaving(false);
    }
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, monthIndex + delta, 1);
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || (loading && !preferences)) {
    return <LoadingSpinner label="Loading your schedule…" />;
  }

  return (
    <PageContainer className="gap-6">
      <SettingsPageLayout className="flex flex-col gap-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <CalendarDays className="size-7" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Session Calendar</h1>
          </div>
          <p className="text-sm text-muted">
            Keep track of upcoming sessions across your campaigns.
          </p>
        </header>

        {loadError ? (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {loadError}
          </p>
        ) : null}

        {preferences ? (
          <>
            <ScheduleSettingsBar
              preferences={preferences}
              saving={prefsSaving}
              onEditVacation={() => setVacationOpen(true)}
              onAutoRsvpEnabledChange={(enabled) => {
                void updatePrefs({
                  autoRsvpEnabled: enabled,
                  autoRsvpDaysBefore: preferences.autoRsvpDaysBefore ?? 7,
                });
              }}
              onAutoRsvpDaysChange={(days) => {
                void updatePrefs({
                  autoRsvpDaysBefore: days,
                  autoRsvpEnabled: preferences.autoRsvpEnabled,
                });
              }}
            />

            <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:items-start">
              <div className="order-2 xl:order-1">
                <ScheduleMonthCalendar
                  year={year}
                  monthIndex={monthIndex}
                  entries={entries}
                  preferences={preferences}
                  onPrevMonth={() => shiftMonth(-1)}
                  onNextMonth={() => shiftMonth(1)}
                  onToday={goToday}
                />
              </div>
              <div className="order-1 space-y-3 xl:order-2">
                <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
                <UpcomingSessionsList upcoming={upcoming} onRsvpChanged={() => void load()} />
              </div>
            </div>

            <SessionCalendarAccess />
          </>
        ) : null}
      </SettingsPageLayout>

      {preferences ? (
        <VacationModal
          open={vacationOpen}
          initialStart={preferences.vacationStartDate}
          initialEnd={preferences.vacationEndDate}
          onClose={() => setVacationOpen(false)}
          onSave={async (start, end) => {
            await updatePrefs({ vacationStartDate: start, vacationEndDate: end });
            await load();
          }}
          onClear={async () => {
            await updatePrefs({ vacationStartDate: null, vacationEndDate: null });
            await load();
          }}
        />
      ) : null}
    </PageContainer>
  );
}
