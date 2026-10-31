import { useSearchParams, useParams, useLocation, useNavigate }  from 'react-router-dom';
import { EventsDirectory } from '@/components/chronology/EventsDirectory';
import { ChronologyEventInlineDetail } from '@/components/chronology/ChronologyEventInlineDetail';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { campaignEventPath, campaignEraPath } from '@/lib/campaignPaths';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HistoricalTimeline, type TimelineSession, type EraTimelineRequest } from '@/components/chronology/HistoricalTimeline';
import { ChronologyCreateEventDialog } from '@/components/chronology/ChronologyCreateEventDialog';
import { ErasView, type ErasSession } from '@/components/chronology/ErasView';
import {
  UniverseHeader,
  type ChronologyView,
  type UniverseClockPill,
} from '@/components/chronology/UniverseHeader';
import { CampaignFeedView } from '@/components/chronology/CampaignFeedView';
import { WidescreenCalendarView, type CalendarSession } from '@/components/chronology/WidescreenCalendarView';
import { chronologyViewParams, linkedInterval } from '@/lib/chronologyNavigation';
import { historicalClock, sharedHistoricalIntervals } from '@/lib/historicalTimeline';
import { useWiki } from '@/contexts/WikiContext';
import { campaignTimeTrackingPath } from '@/lib/campaignPaths';
import {
  fetchChronologyTimeline,
  type ChronologyTimelineBundle,
  type TimelineOccurrenceRecord,
} from '@/lib/chronologyApi';
import { createChronologyCategory } from '@/lib/chronologyCategoriesApi';
import { formatOccurrenceDateLabel, type ChronologyDateParts } from '@/lib/chronologyDates';
import { resolveMonthName } from '@/lib/timeEngine';
import {
  fetchTimeTracking,
  type TimeTrackingBundle,
} from '@/lib/timeTrackingApi';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { bulkRevealContentPresence } from '@/lib/contentPresence';
import {
  fetchChronologyOverlay,
  type ConvergenceOverlayBundle,
} from '@/lib/chronologyOverlayApi';

function parseActiveView(raw: string | null): ChronologyView {
  if (raw === 'events') return 'events';
  if (
    raw === 'timeline' ||
    raw === 'eras' ||
    raw === 'calendar' ||
    raw === 'feed'
  ) {
    return raw;
  }
  return 'calendar';
}

export function ChronologyPage() {
  const { campaignHandle } = useWiki();
  return <ChronologyWorkspace key={campaignHandle} />;
}

function ChronologyWorkspace() {
  const { t } = useTranslation();
  const { campaignHandle, can } = useWiki();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  const setSearchParamsRef = useRef(setSearchParams);
  useLayoutEffect(() => {
    searchParamsRef.current = searchParams;
    setSearchParamsRef.current = setSearchParams;
  }, [searchParams, setSearchParams]);
  const timelineSession = useMemo<TimelineSession>(() => ({}), [campaignHandle]);
  const calendarSession = useMemo<CalendarSession>(() => ({}), [campaignHandle]);
  const erasSession = useMemo<ErasSession>(() => ({}), [campaignHandle]);
  const [eraNavigation, setEraNavigation] = useState<EraTimelineRequest>();
  const [inspectedOccurrence, setInspectedOccurrence] = useState<TimelineOccurrenceRecord | null>(null);
  const handleInspection = useCallback((occurrence: TimelineOccurrenceRecord | null) => {
    if (!occurrence) {
      if (calendarSession.snapshot) calendarSession.snapshot.occurrenceId = null;
      if (timelineSession.snapshot) timelineSession.snapshot.selectedKey = null;
    }
    setInspectedOccurrence(previous => JSON.stringify(previous) === JSON.stringify(occurrence) ? previous : occurrence);
  }, [calendarSession, timelineSession]);
  const route = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedView = route.eventSlug || /\/events$/.test(location.pathname) ? 'events'
    : route.eraSlug || /\/eras$/.test(location.pathname) ? 'eras' : searchParams.get('view');
  const windowMode = searchParams.get('windowMode') ?? 'YEAR_RANGE';
  const from = searchParams.get('from') ?? '0';
  const to = searchParams.get('to') ?? '9999';
  const domainsParam = searchParams.get('domains');

  const [bundle, setBundle] = useState<ChronologyTimelineBundle | null>(null);
  const [overlayBundle, setOverlayBundle] =
    useState<ConvergenceOverlayBundle | null>(null);
  const [timeBundle, setTimeBundle] = useState<TimeTrackingBundle | null>(null);
  const selectedEvent = route.eventSlug ? bundle?.baseEvents.find(event => event.id === route.eventSlug || event.slugAliases?.includes(route.eventSlug!)) : undefined;
  const selectedEra = route.eraSlug ? bundle?.eras?.find(era => era.id === route.eraSlug || era.slugAliases?.includes(route.eraSlug!)) : undefined;
  useEffect(() => {
    if (selectedEvent?.slug && route.eventSlug !== selectedEvent.slug) navigate(campaignEventPath(campaignHandle, selectedEvent.slug) + location.search, { replace: true });
    if (selectedEra?.slug && route.eraSlug !== selectedEra.slug) navigate(campaignEraPath(campaignHandle, selectedEra.slug) + location.search, { replace: true });
  }, [selectedEvent, selectedEra, route.eventSlug, route.eraSlug, navigate, campaignHandle, location.search, searchParams]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedDomains = useMemo(() => domainsParam === null ? [] : domainsParam.split(',').filter(Boolean), [domainsParam]);
  const sessionLinkedOnly = searchParams.get('sessionLinkedOnly') === 'true';
  const feedImportance = searchParams.get('importance') ?? 'MAJOR,MINOR,NOTICE';
  const includeFuture = searchParams.get('includeFuture') === 'true';
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#a78bfa');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [browseCalendarId, setBrowseCalendarId] = useState<string>();
  const handleCalendarBrowse = useCallback(
    (anchor: ChronologyDateParts, calendarId?: string) => {
      setBrowseAnchor(anchor);
      setBrowseCalendarId(calendarId);
    },
    [],
  );
  const [browseAnchor, setBrowseAnchor] = useState<ChronologyDateParts | null>(
    null,
  );
  const activeView = useMemo(
    () => parseActiveView(requestedView),
    [requestedView],
  );
  const feedTargetSignature = activeView === 'feed'
    ? JSON.stringify(['track', 'event', 'occurrence', 'at', 'focus'].map(key => searchParams.get(key)))
    : null;

  const canManageChronologyAccess = can(CampaignCapabilities.CHRONOLOGY_EDIT);
  const elevatedView = can(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW);
  const loadVersion = useRef(0);
  const loadedFeedScope = useRef('');

  const feedDomainsParam = useMemo(() => {
    if (domainsParam === null) return undefined;
    return feedDomains.join(',');
  }, [feedDomains, domainsParam]);

  const load = useCallback(
    async (background = false) => {
      if (!campaignHandle) return;
      const version = ++loadVersion.current;
      const scope = `${campaignHandle}:${activeView}`;
      if (!background && !(activeView === 'feed' && loadedFeedScope.current === scope)) setLoading(true);
      setError(null);
      try {
        const needsOverlay = activeView === 'feed';
        const [data, timeData] = await Promise.all([
          fetchChronologyTimeline(campaignHandle),
          fetchTimeTracking(campaignHandle),
        ]);
        const targetParams = searchParamsRef.current;
        const source = needsOverlay ? timeData.calendars.find(row => row.id === targetParams.get('track')) : undefined;
        const clock = source ? historicalClock(source) : null;
        const target = clock?.axis && clock.aligned ? linkedInterval(targetParams,
          sharedHistoricalIntervals(data.occurrences.filter(row => row.calendarId === source?.id &&
            data.baseEvents.some(base => base.id === row.baseEventId && base.calendarId === row.calendarId)), clock.axis)) : undefined;
        const overlay = needsOverlay
            ? await fetchChronologyOverlay(campaignHandle, {
                order: 'desc', importance: feedImportance, includeFuture,
                windowMode: 'EPOCH_RANGE',
                from: target ? String(target.start) : windowMode === 'EPOCH_RANGE' ? from : undefined,
                to: target ? String(target.end) : windowMode === 'EPOCH_RANGE' ? to : undefined,
                domains: feedDomainsParam,
                sessionLinkedOnly,
              })
            : null;
        if (version !== loadVersion.current) return;
        if (data) {
          setBundle(data);
        }
        setTimeBundle(timeData);
        setOverlayBundle(overlay);
        if (overlay) loadedFeedScope.current = scope;
        // Retain an explicitly focused window for normal tab returns as well as refresh.
        const range = overlay?.feed?.requestedRange;
        const latestParams = searchParamsRef.current;
        if (target && range && latestParams.get('focus') === 'feed' &&
          (latestParams.get('from') !== range.from || latestParams.get('to') !== range.to || latestParams.get('windowMode') !== 'EPOCH_RANGE')) {
          const next = new URLSearchParams(latestParams);
          next.set('windowMode', 'EPOCH_RANGE'); next.set('from', range.from); next.set('to', range.to);
          setSearchParamsRef.current(next, { replace: true });
        }
      } catch (err) {
        if (version !== loadVersion.current) return;
        if (background) throw err;
        setError(
          err instanceof Error
            ? err.message
            : t('campaign.timeline.loadFailed'),
        );
        if (!background) {
          setBundle(null);
          setTimeBundle(null);
          setOverlayBundle(null);
        }
      } finally {
        if (version === loadVersion.current) setLoading(false);
      }
    },
    [
      campaignHandle,
      windowMode,
      from,
      to,
      activeView,
      feedDomainsParam,
      feedImportance,
      includeFuture,
      sessionLinkedOnly,
      feedTargetSignature,
      canManageChronologyAccess,
      elevatedView,
      t,
    ],
  );

  const handleEventMutated = useCallback(async () => {
    await load(true);
  }, [load]);

  const openCreateEvent = async () => {
    // A direct visit to Campaign Feed has not loaded the event catalogue yet.
    if (!bundle) {
      try {
        setBundle(await fetchChronologyTimeline(campaignHandle!));
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : t('campaign.timeline.loadFailed'),
        );
        return;
      }
    }
    setShowCreateModal(true);
  };

  const handleEventDeleted = useCallback(() => {
    if (timelineSession.snapshot) timelineSession.snapshot.selectedKey = null;
  }, [timelineSession]);

  const handleRevealEvent = useCallback(
    async (baseEventId: string) => {
      if (!campaignHandle) return;
      await bulkRevealContentPresence(campaignHandle, [
        { entityType: 'timeline_event', entityId: baseEventId },
      ]);
      await load(true);
    },
    [campaignHandle, load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const contextLabel = useMemo(() => {
    if ((activeView !== 'calendar' && activeView !== 'timeline') || !browseAnchor) return undefined;
    const definition = timeBundle?.calendars.find(row => row.id === browseCalendarId);
    const axis = definition ? historicalClock(definition).axis : null;
    if (!axis || axis.date(browseAnchor) === null) return undefined;
    return 'Viewing ' + formatOccurrenceDateLabel(browseAnchor, resolveMonthName(axis.calendar, browseAnchor.year!, browseAnchor.month!));
  }, [activeView, browseAnchor, browseCalendarId, timeBundle]);

  const calendarClockPills = useMemo((): UniverseClockPill[] => {
    if (!timeBundle) return [];
    return timeBundle.calendars.map((calendar) => ({
      id: calendar.id,
      label: `${calendar.name}: Year ${calendar.state.year}, ${calendar.state.monthName} ${calendar.state.day}`,
    }));
  }, [timeBundle]);

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
        err instanceof Error
          ? err.message
          : t('campaign.timeline.createCategoryFailed'),
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  const categoryFooter =
    canManageChronologyAccess && bundle ? (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">
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
    <div className={activeView === 'events' ? "workspace-field flex min-w-0 flex-col gap-3 p-3" : "flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden p-3"}>
      <UniverseHeader
        campaignHandle={campaignHandle}
        activeView={activeView}
        occurrence={inspectedOccurrence}
        clockPills={calendarClockPills}
        activeCalendarId={activeView === 'feed' ? timeBundle?.calendars.find(row => row.isMasterTime)?.id
          : activeView === 'eras' ? erasSession.snapshot?.track ?? searchParams.get('track') ?? undefined : browseCalendarId}
        contextLabel={contextLabel}
        canCreateEvent={canManageChronologyAccess}
        onCreateEvent={() => void openCreateEvent()}
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
        <div className={activeView === 'events' ? "min-w-0" : "min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background"}>
          {activeView === 'events' && bundle && (route.eventSlug ? selectedEvent ? <article className="space-y-4 p-6">
            <h2 className={TYPE_DISPLAY_CLASS}>{selectedEvent.title}</h2>
            <ChronologyEventInlineDetail campaignHandle={campaignHandle} baseEvent={selectedEvent} fullDescription
              calendarName={bundle.calendars.find(row => row.id === selectedEvent.calendarId)?.name}
              occurrence={bundle.occurrences.find(row => row.baseEventId === selectedEvent.id && row.isStart)}
              timeBundle={timeBundle} categories={bundle.categories} editableEvents={bundle.baseEvents}
              calendarLike={(() => { const calendar = timeBundle.calendars.find(row => row.id === selectedEvent.calendarId); return calendar ? historicalClock(calendar).axis?.calendar ?? null : null; })()}
              canManage={canManageChronologyAccess} onMutated={handleEventMutated} onDeleted={async () => { await handleEventDeleted(); navigate(campaignEventPath(campaignHandle, '').replace(/\/$/, '')); }} />
          </article> : <p className="p-6 text-muted">Event unavailable.</p> : <EventsDirectory bundle={bundle} campaignHandle={campaignHandle} />)}
          {route.eraSlug && !selectedEra && <p className="p-6 text-muted">Era unavailable.</p>}
          {activeView === 'feed' && overlayBundle && (
            <CampaignFeedView bundle={overlayBundle} campaignHandle={campaignHandle} timeBundle={timeBundle}
              onInspectionChange={handleInspection}
              chronologyBundle={bundle} canManageChronology={canManageChronologyAccess} onOverlaySaved={() => load(true)} />
          )}

          {activeView === 'calendar' && bundle && (
            <WidescreenCalendarView
              onInspectionChange={handleInspection}
              session={calendarSession}
              campaignHandle={campaignHandle}
              timeBundle={timeBundle}
              chronologyBundle={bundle}
              baseEvents={bundle.baseEvents}
              categories={bundle.categories}
              canManage={canManageChronologyAccess}
              onBrowseAnchorChange={handleCalendarBrowse}
              onEventMutated={handleEventMutated}
            />
          )}

          {activeView === 'timeline' && bundle && (
            <HistoricalTimeline campaignHandle={campaignHandle} bundle={bundle} timeBundle={timeBundle}
              onInspectionChange={handleInspection}
              session={timelineSession} navigationRequest={eraNavigation}
              canManage={canManageChronologyAccess} onBrowseAnchorChange={handleCalendarBrowse}
              onMutated={handleEventMutated} onDeleted={handleEventDeleted}
              onRevealEvent={handleRevealEvent} categoryFooter={categoryFooter} />
          )}

          {activeView === 'eras' && bundle && (!route.eraSlug || selectedEra) && (
            <ErasView
              onInspectionChange={handleInspection}
              session={erasSession}
              bundle={bundle}
              onErasChanged={() => load(true)}
              campaignHandle={campaignHandle}
              timeBundle={timeBundle}
              canManage={canManageChronologyAccess}
              onEventMutated={handleEventMutated}
              onEventDeleted={handleEventDeleted}
              onRevealEvent={handleRevealEvent}
              onTimeline={(calendarId, eraId, compare) => {
                setEraNavigation(previous => ({ id: (previous?.id ?? 0) + 1, calendarId, eraId, compare }));
                const next = chronologyViewParams(searchParams, 'timeline', { calendarId, eraId });
                setSearchParams(next);
              }}
            />
          )}
        </div>
      )}

      {canManageChronologyAccess && showCreateModal && bundle && timeBundle && (
        <ChronologyCreateEventDialog
          campaignHandle={campaignHandle}
          calendars={timeBundle.calendars}
          categories={bundle.categories}
          events={bundle.baseEvents}
          initialDate={browseAnchor}
          initialCalendarId={
            activeView === 'calendar' || activeView === 'timeline' ? browseCalendarId : undefined
          }
          onClose={() => setShowCreateModal(false)}
          onMutated={handleEventMutated}
        />
      )}
    </div>
  );
}
