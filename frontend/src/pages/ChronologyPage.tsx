import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChronologyEventSidebar } from '@/components/chronology/ChronologyEventSidebar';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import { ConditionTreeBuilder } from '@/components/chronology/ConditionTreeBuilder';
import { EventsLedgerView } from '@/components/chronology/EventsLedgerView';
import { MoonOverridesEditor } from '@/components/chronology/MoonOverridesEditor';
import { TechTreeTimeline } from '@/components/chronology/TechTreeTimeline';
import {
  UniverseHeader,
  type ChronologyView,
  type UniverseClockPill,
} from '@/components/chronology/UniverseHeader';
import { CampaignFeedView } from '@/components/chronology/CampaignFeedView';
import { CampaignHistoryPanel } from '@/components/chronology/CampaignHistoryPanel';
import { WidescreenCalendarView } from '@/components/chronology/WidescreenCalendarView';
import { useWiki } from '@/contexts/WikiContext';
import { campaignTimeTrackingPath } from '@/lib/campaignPaths';
import {
  type ConditionNode,
  fetchChronologyTimeline,
  type ChronologyTimelineBundle,
  type MoonOverride,
  type TimelineBaseEventRecord,
  type TimelineOccurrenceRecord,
} from '@/lib/chronologyApi';
import { createCalendarEvent } from '@/lib/calendarEventsApi';
import { createChronologyCategory } from '@/lib/chronologyCategoriesApi';
import {
  clampChronologyDate,
  nowFromCalendarState,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import { calendarEpochMinuteForDate, type FantasyCalendarLike } from '@/lib/timeEngine';
import {
  fetchTimeTracking,
  type FantasyCalendarApiRow,
  type TimeTrackingBundle,
} from '@/lib/timeTrackingApi';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { bulkRevealContentPresence } from '@/lib/contentPresence';
import {
  fetchChronologyOverlay,
  type ConvergenceOverlayBundle,
} from '@/lib/chronologyOverlayApi';

function calendarApiRowToLike(row: FantasyCalendarApiRow): FantasyCalendarLike {
  return {
    epochOffset: BigInt(row.epochOffset),
    weekdays: row.weekdays,
    months: row.months,
    seasons: row.seasons,
    moons: row.moons,
    leapDays: row.leapDays,
  };
}

function parseActiveView(raw: string | null): ChronologyView {
  if (raw === 'timeline' || raw === 'events' || raw === 'calendar' || raw === 'feed') {
    return raw;
  }
  return 'calendar';
}

export function ChronologyPage() {
  const { t } = useTranslation();
  const { campaignHandle, campaign, can } = useWiki();
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const windowMode = searchParams.get('windowMode') ?? 'YEAR_RANGE';
  const from = searchParams.get('from') ?? '0';
  const to = searchParams.get('to') ?? '9999';
  const domainsParam = searchParams.get('domains');

  const [bundle, setBundle] = useState<ChronologyTimelineBundle | null>(null);
  const [overlayBundle, setOverlayBundle] = useState<ConvergenceOverlayBundle | null>(null);
  const [timeBundle, setTimeBundle] = useState<TimeTrackingBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedDomains, setFeedDomains] = useState<string[]>(() => {
    if (!domainsParam?.trim()) return [];
    return domainsParam
      .split(',')
      .map((domain) => domain.trim())
      .filter(Boolean);
  });
  const [sessionLinkedOnly, setSessionLinkedOnly] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<TimelineOccurrenceRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCalendarId, setCreateCalendarId] = useState<string>('default');
  const [createCategoryId, setCreateCategoryId] = useState<string | 'none'>('none');
  const [createVisibility, setCreateVisibility] = useState<'PUBLIC' | 'PARTY' | 'DM_ONLY'>('PARTY');
  const [createDuration, setCreateDuration] = useState(1);
  const [createIsRepeating, setCreateIsRepeating] = useState(false);
  const [createRepeatInterval, setCreateRepeatInterval] = useState<number | ''>('');
  const [createRepeatUnit, setCreateRepeatUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS'>('DAYS');
  const [createLimitRepetitions, setCreateLimitRepetitions] = useState<number | ''>('');
  const [createConditions, setCreateConditions] = useState<ConditionNode | null>(null);
  const [createMoonOverrides, setCreateMoonOverrides] = useState<MoonOverride[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#a78bfa');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [browseAnchor, setBrowseAnchor] = useState<ChronologyDateParts | null>(null);
  const [createTargetDate, setCreateTargetDate] = useState<ChronologyDateParts>({
    year: 1,
    month: 0,
    day: 1,
  });
  const createModalWasOpenRef = useRef(false);

  const activeView = useMemo(() => parseActiveView(requestedView), [requestedView]);

  const masterCalendar = useMemo(
    () =>
      timeBundle?.calendars.find((calendar) => calendar.isMasterTime) ??
      timeBundle?.calendars[0] ??
      null,
    [timeBundle],
  );

  const createCalendarRow = useMemo(() => {
    if (!timeBundle) return null;
    const resolvedId =
      createCalendarId === 'default' && timeBundle.calendars[0]
        ? timeBundle.calendars[0].id
        : createCalendarId;
    return timeBundle.calendars.find((calendar) => calendar.id === resolvedId) ?? masterCalendar;
  }, [timeBundle, createCalendarId, masterCalendar]);

  const createCalendarLike = useMemo(
    () => (createCalendarRow ? calendarApiRowToLike(createCalendarRow) : null),
    [createCalendarRow],
  );

  const canManageChronologyAccess = can(CampaignCapabilities.CHRONOLOGY_EDIT);

  const managedCalendars = useMemo(() => {
    if (!bundle) return [];
    return bundle.calendars;
  }, [bundle]);

  const editableEvents = useMemo(() => {
    if (!bundle) return [] as TimelineBaseEventRecord[];
    return bundle.baseEvents;
  }, [bundle]);

  const selectedBaseEvent = useMemo(() => {
    if (!bundle || !selectedOccurrence) return null;
    return bundle.baseEvents.find((event) => event.id === selectedOccurrence.baseEventId) ?? null;
  }, [bundle, selectedOccurrence]);

  const selectedEventCalendarLike = useMemo(() => {
    if (!timeBundle || !selectedBaseEvent) return null;
    const row = timeBundle.calendars.find(
      (calendar) => calendar.id === selectedBaseEvent.calendarId,
    );
    return row ? calendarApiRowToLike(row) : null;
  }, [timeBundle, selectedBaseEvent]);

  useEffect(() => {
    if (activeView !== 'timeline' || !timeBundle) return;

    if (selectedOccurrence) {
      setBrowseAnchor({
        year: selectedOccurrence.start.year,
        month: selectedOccurrence.start.month,
        day: selectedOccurrence.start.day,
      });
      return;
    }

    if (masterCalendar) {
      setBrowseAnchor(nowFromCalendarState(masterCalendar.state));
    }
  }, [activeView, selectedOccurrence, timeBundle, masterCalendar]);

  useEffect(() => {
    if (!showCreateModal) {
      createModalWasOpenRef.current = false;
      return;
    }

    if (!createModalWasOpenRef.current && timeBundle) {
      const seed =
        browseAnchor ??
        (masterCalendar ? nowFromCalendarState(masterCalendar.state) : { year: 1, month: 0, day: 1 });
      const calendarLike = createCalendarLike ?? (masterCalendar ? calendarApiRowToLike(masterCalendar) : null);
      setCreateTargetDate(
        calendarLike ? clampChronologyDate(calendarLike, seed) : seed,
      );
    }

    createModalWasOpenRef.current = true;
  }, [showCreateModal, browseAnchor, timeBundle, masterCalendar, createCalendarLike]);

  useEffect(() => {
    if (!showCreateModal || !createCalendarLike) return;
    setCreateTargetDate((previous) => clampChronologyDate(createCalendarLike, previous));
  }, [showCreateModal, createCalendarId, createCalendarLike]);

  const feedDomainsParam = useMemo(() => {
    if (feedDomains.length === 0) return undefined;
    return feedDomains.join(',');
  }, [feedDomains]);

  const load = useCallback(async () => {
    if (!campaignHandle) return;
    setLoading(true);
    setError(null);
    try {
      const needsTimeline = activeView !== 'feed';
      const needsOverlay = activeView === 'feed';
      const [data, timeData, overlay] = await Promise.all([
        needsTimeline
          ? fetchChronologyTimeline(campaignHandle)
          : Promise.resolve(null),
        fetchTimeTracking(campaignHandle),
        needsOverlay
          ? fetchChronologyOverlay(campaignHandle, {
              windowMode,
              from,
              to,
              domains: feedDomainsParam,
              sessionLinkedOnly,
            })
          : Promise.resolve(null),
      ]);
      if (data) {
        setBundle(data);
      }
      setTimeBundle(timeData);
      setOverlayBundle(overlay);
      if (data) {
        setSelectedOccurrence((previous) =>
          previous
            ? data.occurrences.find((event) => event.occurrenceId === previous.occurrenceId) ??
              data.occurrences.find((event) => event.baseEventId === previous.baseEventId) ??
              null
            : null,
        );
        if (data.calendars.length > 0 && createCalendarId === 'default') {
          setCreateCalendarId(data.calendars[0]?.id ?? 'default');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('campaign.timeline.loadFailed'));
      setBundle(null);
      setTimeBundle(null);
      setOverlayBundle(null);
    } finally {
      setLoading(false);
    }
  }, [
    campaignHandle,
    windowMode,
    from,
    to,
    createCalendarId,
    activeView,
    feedDomainsParam,
    sessionLinkedOnly,
    t,
  ]);

  const handleEventMutated = useCallback(async () => {
    await load();
  }, [load]);

  const handleEventDeleted = useCallback(() => {
    setSelectedOccurrence(null);
  }, []);

  const handleRevealEvent = useCallback(
    async (baseEventId: string) => {
      if (!campaignHandle) return;
      await bulkRevealContentPresence(campaignHandle, [
        { entityType: 'timeline_event', entityId: baseEventId },
      ]);
      await load();
    },
    [campaignHandle, load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (activeView === 'calendar') {
      setSelectedOccurrence(null);
    }
  }, [activeView]);

  const calendarClockPills = useMemo((): UniverseClockPill[] => {
    if (!timeBundle) return [];
    return timeBundle.calendars.map((calendar) => ({
      id: calendar.id,
      label: `${calendar.name}: Year ${calendar.state.year}, ${calendar.state.monthName} ${calendar.state.day}`,
    }));
  }, [timeBundle]);

  async function handleCreateEvent() {
    if (!campaignHandle || !bundle) return;
    if (!createTitle.trim()) {
      window.alert(t('campaign.timeline.titleRequired'));
      return;
    }
    const calendarId =
      createCalendarId === 'default' && bundle.calendars[0]
        ? bundle.calendars[0].id
        : createCalendarId;
    if (!calendarId || calendarId === 'default') {
      window.alert('Please choose a calendar track.');
      return;
    }
    const calendarRow =
      timeBundle?.calendars.find((calendar) => calendar.id === calendarId) ?? masterCalendar;
    if (!calendarRow) {
      window.alert('Calendar profile not found.');
      return;
    }

    const calendarLike = calendarApiRowToLike(calendarRow);
    const targetDate = clampChronologyDate(calendarLike, createTargetDate);
    if (targetDate.year === null || targetDate.month === null || targetDate.day === null) {
      window.alert('Please choose a valid event date.');
      return;
    }

    setCreating(true);
    try {
      const created = await createCalendarEvent(campaignHandle, calendarId, {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        categoryId: createCategoryId === 'none' ? null : createCategoryId,
        visibility: createVisibility,
        targetYear: targetDate.year,
        targetMonth: targetDate.month,
        targetDay: targetDate.day,
        targetEpochMinute: calendarEpochMinuteForDate(
          calendarLike,
          targetDate.year,
          targetDate.month,
          targetDate.day,
        ).toString(),
        duration: Math.max(1, createDuration),
        isRepeating: createIsRepeating,
        repeatInterval:
          createIsRepeating && createRepeatInterval !== ''
            ? Math.max(1, Number(createRepeatInterval))
            : null,
        repeatUnit: createIsRepeating ? createRepeatUnit : null,
        limitRepetitions:
          createLimitRepetitions === '' ? null : Math.max(1, Number(createLimitRepetitions)),
        conditions: createConditions,
        moonOverrides: createMoonOverrides,
      });
      await load();
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateCategoryId('none');
      setCreateVisibility('PARTY');
      setCreateDuration(1);
      setCreateIsRepeating(false);
      setCreateRepeatInterval('');
      setCreateLimitRepetitions('');
      setCreateConditions(null);
      setCreateMoonOverrides(null);
      setSelectedOccurrence(
        bundle?.occurrences.find((row) => row.baseEventId === created.id) ?? null,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t('campaign.timeline.createEventFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateCategory() {
    if (!campaignHandle || !newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      await createChronologyCategory(campaignHandle, {
        name: newCategoryName.trim(),
        color: newCategoryColor.trim() || null,
      });
      setNewCategoryName('');
      await load();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : t('campaign.timeline.createCategoryFailed'),
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  const categoryFooter = canManageChronologyAccess && bundle ? (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {t('campaign.timeline.categoriesLabel')}
      </p>
      <div className="flex flex-wrap gap-1">
        {bundle.categories.map((category) => (
          <span
            key={category.id}
            className="rounded-full border border-border px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: `${category.color ?? '#334155'}22` }}
          >
            {category.name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_90px_auto] gap-2">
        <input
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder="New category"
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        />
        <input
          type="color"
          value={newCategoryColor}
          onChange={(event) => setNewCategoryColor(event.target.value)}
          className="h-8 rounded border border-border bg-background"
        />
        <button
          type="button"
          disabled={creatingCategory || !newCategoryName.trim()}
          onClick={() => void handleCreateCategory()}
          className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
        >
          {t('campaign.timeline.addCategory')}
        </button>
      </div>
    </div>
  ) : null;

  if (!campaignHandle) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden p-3">
      <UniverseHeader
        campaignHandle={campaignHandle}
        activeView={activeView}
        clockPills={calendarClockPills}
        canCreateEvent={canManageChronologyAccess}
        onCreateEvent={() => setShowCreateModal(true)}
        settingsHref={campaignTimeTrackingPath(campaignHandle)}
      />

      {loading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          {t('campaign.timeline.loadingChronology')}
        </div>
      )}

      {!loading && error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && timeBundle && (bundle || overlayBundle) && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background">
          {activeView === 'feed' && overlayBundle && (
            <div className="flex h-full flex-col gap-4 overflow-auto p-4">
              <CampaignFeedView
                bundle={overlayBundle}
                selectedDomains={feedDomains}
                sessionLinkedOnly={sessionLinkedOnly}
                onDomainsChange={setFeedDomains}
                onSessionLinkedOnlyChange={setSessionLinkedOnly}
                canManageChronology={canManageChronologyAccess}
                onOverlaySaved={() => void load()}
              />
              {canManageChronologyAccess ? (
                <CampaignHistoryPanel campaignHandle={campaignHandle} />
              ) : null}
            </div>
          )}

          {activeView === 'calendar' && bundle && (
            <WidescreenCalendarView
              campaignHandle={campaignHandle}
              timeBundle={timeBundle}
              chronologyBundle={bundle}
              baseEvents={bundle.baseEvents}
              categories={bundle.categories}
              canManage={canManageChronologyAccess}
              onBrowseAnchorChange={setBrowseAnchor}
              onEventMutated={handleEventMutated}
            />
          )}

          {activeView === 'timeline' && bundle && (
            <div className="flex h-full overflow-hidden">
              <div className="min-w-0 basis-4/5 overflow-hidden">
                <TechTreeTimeline
                  categories={bundle.categories}
                  calendars={bundle.calendars}
                  events={bundle.events}
                  selectedBaseEventId={selectedOccurrence?.baseEventId ?? null}
                  onSelectEvent={setSelectedOccurrence}
                  showElevatedVisibility={canManageChronologyAccess}
                />
              </div>
              <div className="basis-1/5 min-w-0 overflow-hidden">
                <ChronologyEventSidebar
                  campaignHandle={campaignHandle}
                  baseEvent={selectedBaseEvent}
                  categories={bundle.categories}
                  editableEvents={editableEvents}
                  calendarLike={selectedEventCalendarLike}
                  canManage={canManageChronologyAccess}
                  dateSeed={
                    selectedOccurrence
                      ? {
                          year: selectedOccurrence.start.year,
                          month: selectedOccurrence.start.month,
                          day: selectedOccurrence.start.day,
                        }
                      : null
                  }
                  open={selectedBaseEvent !== null}
                  onClose={() => setSelectedOccurrence(null)}
                  onMutated={handleEventMutated}
                  onDeleted={handleEventDeleted}
                  onRevealEvent={handleRevealEvent}
                  categoryFooter={categoryFooter}
                />
              </div>
            </div>
          )}

          {activeView === 'events' && bundle && (
            <EventsLedgerView
              campaignHandle={campaignHandle}
              categories={bundle.categories}
              calendars={bundle.calendars}
              events={bundle.events}
              baseEvents={bundle.baseEvents}
              timeBundle={timeBundle}
              canManage={canManageChronologyAccess}
              selectedEventId={selectedOccurrence?.occurrenceId ?? null}
              onSelectEvent={setSelectedOccurrence}
              onBrowseAnchorChange={setBrowseAnchor}
              onEventMutated={handleEventMutated}
              onEventDeleted={handleEventDeleted}
            />
          )}
        </div>
      )}

      {canManageChronologyAccess && showCreateModal && bundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {t('campaign.timeline.createEventTitle')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateTitle('');
                  setCreateDescription('');
                  setCreateCategoryId('none');
                }}
                className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted">
                  {t('campaign.timeline.fieldTitle')}
                </span>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                  maxLength={120}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted">
                  {t('campaign.timeline.fieldDescription')}
                </span>
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted">Calendar track</span>
                <select
                  value={createCalendarId}
                  onChange={(event) => setCreateCalendarId(event.target.value)}
                  className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="default">Choose...</option>
                  {managedCalendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </select>
              </label>
              {createCalendarLike && (
                <FantasyDatePicker
                  calendar={createCalendarLike}
                  value={createTargetDate}
                  onChange={setCreateTargetDate}
                  disabled={creating}
                />
              )}
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted">Category</span>
                <select
                  value={createCategoryId}
                  onChange={(event) =>
                    setCreateCategoryId(event.target.value === 'none' ? 'none' : event.target.value)
                  }
                  className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="none">Uncategorized</option>
                  {bundle.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-muted">Duration (days)</span>
                  <input
                    type="number"
                    min={1}
                    value={createDuration}
                    onChange={(event) =>
                      setCreateDuration(Math.max(1, Number(event.target.value) || 1))
                    }
                    className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={createIsRepeating}
                    onChange={(event) => setCreateIsRepeating(event.target.checked)}
                  />
                  Repeating
                </label>
              </div>
              {createIsRepeating && (
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    type="number"
                    min={1}
                    value={createRepeatInterval}
                    onChange={(event) =>
                      setCreateRepeatInterval(
                        event.target.value ? Math.max(1, Number(event.target.value)) : '',
                      )
                    }
                    placeholder="Interval"
                    className="rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                  <select
                    value={createRepeatUnit}
                    onChange={(event) =>
                      setCreateRepeatUnit(
                        event.target.value as 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS',
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-xs"
                  >
                    <option value="DAYS">DAYS</option>
                    <option value="MONTHS">MONTHS</option>
                    <option value="YEARS">YEARS</option>
                    <option value="ERAS">ERAS</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={createLimitRepetitions}
                    onChange={(event) =>
                      setCreateLimitRepetitions(
                        event.target.value ? Math.max(1, Number(event.target.value)) : '',
                      )
                    }
                    placeholder="Limit repetitions"
                    className="rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                </div>
              )}
              <ConditionTreeBuilder value={createConditions} onChange={setCreateConditions} />
              <MoonOverridesEditor value={createMoonOverrides} onChange={setCreateMoonOverrides} />
              <fieldset className="space-y-1 text-xs">
                <legend className="font-semibold text-muted">Visibility</legend>
                <div className="flex flex-wrap gap-2">
                  {(['PUBLIC', 'PARTY', 'DM_ONLY'] as const).map((value) => (
                    <label
                      key={value}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                        createVisibility === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="create-event-visibility"
                        value={value}
                        checked={createVisibility === value}
                        onChange={() => setCreateVisibility(value)}
                        className="hidden"
                      />
                      <span className="text-[11px]">{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateTitle('');
                  setCreateDescription('');
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreateEvent()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
              >
                <Plus className="size-4" />
                {creating ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
