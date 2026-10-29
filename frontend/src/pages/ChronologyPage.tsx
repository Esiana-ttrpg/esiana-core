import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChronologyEventSidebar } from '@/components/chronology/ChronologyEventSidebar';
import { ChronologyCreateEventDialog } from '@/components/chronology/ChronologyCreateEventDialog';
import { ErasView } from '@/components/chronology/ErasView';
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
  fetchChronologyTimeline,
  type ChronologyTimelineBundle,
  type TimelineBaseEventRecord,
  type TimelineOccurrenceRecord,
} from '@/lib/chronologyApi';
import { createChronologyCategory } from '@/lib/chronologyCategoriesApi';
import {
  nowFromCalendarState,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
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
  if (raw === 'events') return 'eras';
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
  const { t } = useTranslation();
  const { campaignHandle, can } = useWiki();
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const windowMode = searchParams.get('windowMode') ?? 'YEAR_RANGE';
  const from = searchParams.get('from') ?? '0';
  const to = searchParams.get('to') ?? '9999';
  const domainsParam = searchParams.get('domains');

  const [bundle, setBundle] = useState<ChronologyTimelineBundle | null>(null);
  const [overlayBundle, setOverlayBundle] =
    useState<ConvergenceOverlayBundle | null>(null);
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
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<TimelineOccurrenceRecord | null>(null);
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

  const masterCalendar = useMemo(
    () =>
      timeBundle?.calendars.find((calendar) => calendar.isMasterTime) ??
      timeBundle?.calendars[0] ??
      null,
    [timeBundle],
  );

  const canManageChronologyAccess = can(CampaignCapabilities.CHRONOLOGY_EDIT);

  const editableEvents = useMemo(() => {
    if (!bundle) return [] as TimelineBaseEventRecord[];
    return bundle.baseEvents;
  }, [bundle]);

  const selectedBaseEvent = useMemo(() => {
    if (!bundle || !selectedOccurrence) return null;
    return (
      bundle.baseEvents.find(
        (event) => event.id === selectedOccurrence.baseEventId,
      ) ?? null
    );
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

  const feedDomainsParam = useMemo(() => {
    if (feedDomains.length === 0) return undefined;
    return feedDomains.join(',');
  }, [feedDomains]);

  const load = useCallback(
    async (background = false) => {
      if (!campaignHandle) return;
      if (!background) setLoading(true);
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
              ? (data.occurrences.find(
                  (event) => event.occurrenceId === previous.occurrenceId,
                ) ??
                data.occurrences.find(
                  (event) => event.baseEventId === previous.baseEventId,
                ) ??
                null)
              : null,
          );
        }
      } catch (err) {
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
        setLoading(false);
      }
    },
    [
      campaignHandle,
      windowMode,
      from,
      to,
      activeView,
      feedDomainsParam,
      sessionLinkedOnly,
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
              onBrowseAnchorChange={handleCalendarBrowse}
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
                  showElevatedVisibility={can(
                    CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
                  )}
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

          {activeView === 'eras' && bundle && (
            <ErasView
              eras={bundle.eras ?? []}
              onErasChanged={() => load(true)}
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

      {canManageChronologyAccess && showCreateModal && bundle && timeBundle && (
        <ChronologyCreateEventDialog
          campaignHandle={campaignHandle}
          calendars={timeBundle.calendars}
          categories={bundle.categories}
          events={bundle.baseEvents}
          initialDate={browseAnchor}
          initialCalendarId={
            activeView === 'calendar' ? browseCalendarId : undefined
          }
          onClose={() => setShowCreateModal(false)}
          onMutated={handleEventMutated}
        />
      )}
    </div>
  );
}
