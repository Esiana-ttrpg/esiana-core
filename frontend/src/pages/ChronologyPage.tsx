import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HistoricalTimeline, type TimelineSession, type EraTimelineRequest } from '@/components/chronology/HistoricalTimeline';
import { ChronologyCreateEventDialog } from '@/components/chronology/ChronologyCreateEventDialog';
import { ErasView } from '@/components/chronology/ErasView';
import {
  UniverseHeader,
  type ChronologyView,
  type UniverseClockPill,
} from '@/components/chronology/UniverseHeader';
import { CampaignFeedView } from '@/components/chronology/CampaignFeedView';
import { WidescreenCalendarView } from '@/components/chronology/WidescreenCalendarView';
import { useWiki } from '@/contexts/WikiContext';
import { campaignTimeTrackingPath } from '@/lib/campaignPaths';
import {
  fetchChronologyTimeline,
  type ChronologyTimelineBundle,
} from '@/lib/chronologyApi';
import { createChronologyCategory } from '@/lib/chronologyCategoriesApi';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const timelineSession = useMemo<TimelineSession>(() => ({}), [campaignHandle]);
  const [eraNavigation, setEraNavigation] = useState<EraTimelineRequest>();
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

  const canManageChronologyAccess = can(CampaignCapabilities.CHRONOLOGY_EDIT);
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
        const needsTimeline = activeView !== 'feed';
        const needsOverlay = activeView === 'feed';
        const [data, timeData, overlay] = await Promise.all([
          needsTimeline
            ? fetchChronologyTimeline(campaignHandle)
            : Promise.resolve(null),
          fetchTimeTracking(campaignHandle),
          needsOverlay
            ? fetchChronologyOverlay(campaignHandle, {
                order: 'desc', importance: feedImportance, includeFuture,
                windowMode: 'EPOCH_RANGE',
                from: windowMode === 'EPOCH_RANGE' ? from : undefined,
                to: windowMode === 'EPOCH_RANGE' ? to : undefined,
                domains: feedDomainsParam,
                sessionLinkedOnly,
              })
            : Promise.resolve(null),
        ]);
        if (version !== loadVersion.current) return;
        if (data) {
          setBundle(data);
        }
        setTimeBundle(timeData);
        setOverlayBundle(overlay);
        if (overlay) loadedFeedScope.current = scope;
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
            <CampaignFeedView bundle={overlayBundle} campaignHandle={campaignHandle} timeBundle={timeBundle}
              chronologyBundle={bundle} canManageChronology={canManageChronologyAccess} onOverlaySaved={() => load(true)} />
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
            <HistoricalTimeline campaignHandle={campaignHandle} bundle={bundle} timeBundle={timeBundle}
              session={timelineSession} navigationRequest={eraNavigation}
              canManage={canManageChronologyAccess} onBrowseAnchorChange={handleCalendarBrowse}
              onMutated={handleEventMutated} onDeleted={handleEventDeleted}
              onRevealEvent={handleRevealEvent} categoryFooter={categoryFooter} />
          )}

          {activeView === 'eras' && bundle && (
            <ErasView
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
                const next = new URLSearchParams(searchParams);
                next.set('view', 'timeline'); next.set('track', calendarId); next.set('era', eraId);
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
