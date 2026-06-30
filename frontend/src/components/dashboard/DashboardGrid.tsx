import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updateDashboardLayout } from '@/lib/dashboard';
import {
  DASHBOARD_MAX_ENABLED_WIDGETS,
  DASHBOARD_WIDGET_LABELS,
  RETIRED_DASHBOARD_WIDGET_BANK_IDS,
  type DashboardConfig,
  type DashboardThreadBundle,
  type DashboardQuestPage,
  type DashboardWidgetId,
  type DashboardWidgetPlacement,
} from '@/lib/dashboardConfig';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import type {
  DashboardWorldEventsFeedResult,
  FactionConflictFeedResult,
  RecentEntitiesFeedResult,
} from '@/lib/dashboardWidgetFeeds';
import { CalendarWidget } from '@/components/dashboard/widgets/CalendarWidget';
import { CampaignPulseWidget } from '@/components/dashboard/widgets/CampaignPulseWidget';
import { ContinueWhereYouLeftOffWidget } from '@/components/dashboard/widgets/ContinueWhereYouLeftOffWidget';
import { LastSessionNotesWidget } from '@/components/dashboard/widgets/LastSessionNotesWidget';
import { PinnedItemsWidget } from '@/components/dashboard/widgets/PinnedItemsWidget';
import { QuestLedgerWidget } from '@/components/dashboard/widgets/QuestLedgerWidget';
import { LivingThreadsWidget } from '@/components/dashboard/widgets/LivingThreadsWidget';
import { QuickUtilityNav } from '@/components/dashboard/widgets/QuickUtilityNav';
import { RecentLoreWidget } from '@/components/dashboard/widgets/RecentLoreWidget';
import { SessionScheduleCard } from '@/components/dashboard/widgets/SessionScheduleCard';
import { WorldChronometerWidget } from '@/components/dashboard/widgets/WorldChronometerWidget';
import { WorldPressureForecastWidget } from '@/components/dashboard/widgets/WorldPressureForecastWidget';
import { WorldSnapshotWidget } from '@/components/dashboard/widgets/WorldSnapshotWidget';
import { CampaignAtAGlanceWidget } from '@/components/dashboard/widgets/CampaignAtAGlanceWidget';
import { CurrentStoryWidget } from '@/components/dashboard/widgets/CurrentStoryWidget';
import { PartyRosterWidget } from '@/components/dashboard/widgets/PartyRosterWidget';
import { RecentActivityWidget } from '@/components/dashboard/widgets/RecentActivityWidget';
import { ExploreWidget } from '@/components/dashboard/widgets/ExploreWidget';
import { RecentEntitiesWidget } from '@/components/dashboard/widgets/RecentEntitiesWidget';
import { WorldEventsWidget } from '@/components/dashboard/widgets/WorldEventsWidget';
import { FactionsAtWarWidget } from '@/components/dashboard/widgets/FactionsAtWarWidget';
import { getCompositionProfile } from '@/lib/compositionDoctrine';
import {
  buildPluginWidgetPlacementId,
  listLayoutWidgets,
  parsePluginWidgetPlacementId,
} from '@/lib/pluginPresentation';
import { PluginDashboardWidget } from '@/components/dashboard/PluginDashboardWidget';
import { SECTION_GAP_CLASS, SURFACE_OPERATIONAL_CLASS } from '@/lib/surfaceLayout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const DASHBOARD_COLS = 12;
const DASHBOARD_ROW_HEIGHT = 88;
const LAYOUT_SAVE_DEBOUNCE_MS = 450;

export interface DashboardGridProps {
  campaignHandle: string;
  config: DashboardConfig;
  summary: DashboardSummary;
  questPages: DashboardQuestPage[];
  threadBundle: DashboardThreadBundle;
  canEditLayout: boolean;
  canManageCampaign: boolean;
  canManageTime: boolean;
  isLookingForGroup: boolean;
  sessionDuration: string | null | undefined;
  narrativeSnapshot?: CampaignNarrativeSnapshot;
  recentEntities?: RecentEntitiesFeedResult | null;
  worldEvents?: DashboardWorldEventsFeedResult | null;
  factionConflict?: FactionConflictFeedResult | null;
  customizeMode: boolean;
  onConfigChange: (config: DashboardConfig) => void;
  onLayoutSavingChange?: (saving: boolean) => void;
}

export function DashboardGrid({
  campaignHandle,
  config,
  summary,
  questPages,
  threadBundle,
  canEditLayout,
  canManageCampaign,
  canManageTime,
  isLookingForGroup,
  sessionDuration,
  narrativeSnapshot,
  recentEntities,
  worldEvents,
  factionConflict,
  customizeMode,
  onConfigChange,
  onLayoutSavingChange,
}: DashboardGridProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(960);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledWidgets = useMemo(
    () => config.widgets.filter((widget) => widget.enabled),
    [config.widgets],
  );
  const hiddenWidgets = useMemo(
    () =>
      config.widgets.filter(
        (widget) =>
          !widget.enabled && !RETIRED_DASHBOARD_WIDGET_BANK_IDS.has(widget.id),
      ),
    [config.widgets],
  );
  const pluginWidgetBank = useMemo(
    () => listLayoutWidgets('dashboard'),
    [],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setGridWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    setGridWidth(Math.floor(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  const persistLayout = useCallback(
    async (nextConfig: DashboardConfig) => {
      onLayoutSavingChange?.(true);
      try {
        const saved = await updateDashboardLayout(campaignHandle, nextConfig);
        onConfigChange(saved);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : t('campaign.dashboard.layoutSaveFailed'),
        );
      } finally {
        onLayoutSavingChange?.(false);
      }
    },
    [campaignHandle, onConfigChange, onLayoutSavingChange, t],
  );

  const scheduleSave = useCallback(
    (nextConfig: DashboardConfig) => {
      onConfigChange(nextConfig);
      if (!canEditLayout) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistLayout(nextConfig);
      }, LAYOUT_SAVE_DEBOUNCE_MS);
    },
    [canEditLayout, onConfigChange, persistLayout],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const gridLayout = useMemo<Layout[]>(
    () =>
      enabledWidgets.map((widget) => ({
        i: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        minW: 2,
        minH: 2,
      })),
    [enabledWidgets],
  );

  const applyWidgets = useCallback(
    (widgets: DashboardWidgetPlacement[]) => {
      scheduleSave({ ...config, widgets });
    },
    [config, scheduleSave],
  );

  const handleLayoutCommit = useCallback(
    (layout: Layout[]) => {
      if (!customizeMode) return;
      const nextWidgets = config.widgets.map((widget) => {
        if (!widget.enabled) return widget;
        const item = layout.find((entry) => entry.i === widget.id);
        return item
          ? { ...widget, x: item.x, y: item.y, w: item.w, h: item.h }
          : widget;
      });
      applyWidgets(nextWidgets);
    },
    [applyWidgets, config.widgets, customizeMode],
  );

  const hideWidget = useCallback(
    (widgetId: DashboardWidgetId) => {
      applyWidgets(
        config.widgets.map((widget) =>
          widget.id === widgetId ? { ...widget, enabled: false } : widget,
        ),
      );
    },
    [applyWidgets, config.widgets],
  );

  const restoreWidget = useCallback(
    (widgetId: string) => {
      if (enabledWidgets.length >= DASHBOARD_MAX_ENABLED_WIDGETS) {
        window.alert(
          `Campaign Home supports up to ${DASHBOARD_MAX_ENABLED_WIDGETS} active widgets. Hide one before adding another.`,
        );
        return;
      }
      const nextRow = enabledWidgets.reduce(
        (maxY, widget) => Math.max(maxY, widget.y + widget.h),
        0,
      );
      const existing = config.widgets.find((widget) => widget.id === widgetId);
      if (existing) {
        applyWidgets(
          config.widgets.map((widget) =>
            widget.id === widgetId
              ? { ...widget, enabled: true, x: 0, y: nextRow, w: widget.w, h: widget.h }
              : widget,
          ),
        );
        return;
      }
      const parsed = parsePluginWidgetPlacementId(widgetId);
      const layout = parsed
        ? listLayoutWidgets('dashboard').find(
            (entry) => entry.pluginId === parsed.pluginId && entry.id === parsed.widgetId,
          )
        : undefined;
      applyWidgets([
        ...config.widgets,
        {
          id: widgetId as DashboardWidgetId,
          x: 0,
          y: nextRow,
          w: layout?.minW ?? layout?.minWidth ?? 4,
          h: layout?.minH ?? layout?.minHeight ?? 3,
          enabled: true,
          config: {},
        },
      ]);
    },
    [applyWidgets, config.widgets, enabledWidgets],
  );

  const updateWidgetConfig = useCallback(
    (widgetId: DashboardWidgetId, widgetConfig: Record<string, unknown>) => {
      applyWidgets(
        config.widgets.map((widget) =>
          widget.id === widgetId ? { ...widget, config: widgetConfig } : widget,
        ),
      );
    },
    [applyWidgets, config.widgets],
  );

  const personal = summary.personal;

  return (
    <div className={`flex flex-col ${SECTION_GAP_CLASS}`}>
      <div
        className={`relative ${customizeMode && hiddenWidgets.length > 0 ? 'pr-56' : ''}`}
      >
        <div ref={containerRef} className={`min-h-[420px] w-full ${getCompositionProfile('dashboard')?.widgetWeightCurve === 'staggered' ? 'dashboard-widget-grid--staggered' : ''}`}>
          <GridLayout
            className="layout"
            layout={gridLayout}
            cols={DASHBOARD_COLS}
            rowHeight={DASHBOARD_ROW_HEIGHT}
            width={gridWidth}
            isDraggable={customizeMode}
            isResizable={customizeMode}
            draggableHandle=".dashboard-drag-handle"
            onDragStop={handleLayoutCommit}
            onResizeStop={handleLayoutCommit}
            margin={[16, 16]}
            useCSSTransforms
          >
            {enabledWidgets.map((widget) => (
              <div key={widget.id}>
                <DashboardWidgetRenderer
                  widget={widget}
                  campaignHandle={campaignHandle}
                  summary={summary}
                  questPages={questPages}
                  threadBundle={threadBundle}
                  canManageCampaign={canManageCampaign}
                  canManageTime={canManageTime}
                  isLookingForGroup={isLookingForGroup}
                  sessionDuration={sessionDuration}
                  narrativeSnapshot={narrativeSnapshot}
                  recentEntities={recentEntities}
                  worldEvents={worldEvents}
                  factionConflict={factionConflict}
                  personalizeContinue={personal?.continueWhereYouLeftOff ?? []}
                  personalizePinned={personal?.pinned ?? []}
                  customizeMode={customizeMode}
                  onHideWidget={hideWidget}
                  onWidgetConfigChange={updateWidgetConfig}
                />
              </div>
            ))}
          </GridLayout>
        </div>

        {customizeMode && hiddenWidgets.length > 0 ? (
          <aside
            className={`${SURFACE_OPERATIONAL_CLASS} absolute right-0 top-0 w-52 rounded-xl border border-border/40 bg-background/90 p-3 shadow-lg backdrop-blur-sm`}
          >
            <h3 className="mb-2 text-sm font-medium text-muted">
              {t('campaign.dashboard.widgetBank')}
            </h3>
            <ul className="space-y-2">
              {hiddenWidgets.map((widget) => (
                <li key={widget.id}>
                  <button
                    type="button"
                    onClick={() => restoreWidget(widget.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-2 py-2 text-left text-xs text-foreground hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="size-3.5 shrink-0" />
                    {translateDashboardWidgetLabel(
                      widget.id as DashboardWidgetId,
                      DASHBOARD_WIDGET_LABELS[widget.id as DashboardWidgetId] ??
                        parsePluginWidgetPlacementId(widget.id)?.widgetId ??
                        widget.id,
                    )}
                  </button>
                </li>
              ))}
              {pluginWidgetBank
                .filter(
                  (entry) =>
                    !config.widgets.some(
                      (widget) =>
                        widget.id === buildPluginWidgetPlacementId(entry.pluginId, entry.id),
                    ),
                )
                .map((entry) => (
                  <li key={`${entry.pluginId}:${entry.id}`}>
                    <button
                      type="button"
                      onClick={() =>
                        restoreWidget(
                          buildPluginWidgetPlacementId(entry.pluginId, entry.id) as DashboardWidgetId,
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-2 py-2 text-left text-xs text-foreground hover:border-primary/50 hover:text-primary"
                    >
                      <Plus className="size-3.5 shrink-0" />
                      {entry.title}
                    </button>
                  </li>
                ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

interface DashboardWidgetRendererProps {
  widget: DashboardWidgetPlacement;
  campaignHandle: string;
  summary: DashboardSummary;
  questPages: DashboardQuestPage[];
  threadBundle: DashboardThreadBundle;
  canManageCampaign: boolean;
  canManageTime: boolean;
  isLookingForGroup: boolean;
  sessionDuration: string | null | undefined;
  narrativeSnapshot?: CampaignNarrativeSnapshot;
  recentEntities?: RecentEntitiesFeedResult | null;
  worldEvents?: DashboardWorldEventsFeedResult | null;
  factionConflict?: FactionConflictFeedResult | null;
  personalizeContinue: NonNullable<DashboardSummary['personal']>['continueWhereYouLeftOff'];
  personalizePinned: NonNullable<DashboardSummary['personal']>['pinned'];
  customizeMode: boolean;
  onHideWidget: (widgetId: DashboardWidgetId) => void;
  onWidgetConfigChange: (
    widgetId: DashboardWidgetId,
    widgetConfig: Record<string, unknown>,
  ) => void;
}

function DashboardWidgetRenderer({
  widget,
  campaignHandle,
  summary,
  questPages,
  threadBundle,
  canManageCampaign,
  canManageTime,
  isLookingForGroup,
  sessionDuration,
  narrativeSnapshot,
  recentEntities,
  worldEvents,
  factionConflict,
  personalizeContinue,
  personalizePinned,
  customizeMode,
  onHideWidget,
  onWidgetConfigChange,
}: DashboardWidgetRendererProps) {
  const shellProps = {
    customizeMode,
    onHide: customizeMode ? () => onHideWidget(widget.id) : undefined,
  };

  switch (widget.id) {
    case 'sessionSchedule':
    case 'sessionClock':
      return (
        <SessionScheduleCard
          campaignHandle={campaignHandle}
          schedule={summary.schedule}
          nextSession={summary.nextSession}
          canManageCampaign={canManageCampaign}
          {...shellProps}
        />
      );
    case 'worldChronometer':
    case 'worldClock':
      return (
        <WorldChronometerWidget
          campaignHandle={campaignHandle}
          chronometer={summary.chronometer}
          {...shellProps}
        />
      );
    case 'recentLore':
    case 'activityLoop':
      return (
        <RecentLoreWidget items={summary.recent.items} {...shellProps} />
      );
    case 'questLedger':
      return (
        <QuestLedgerWidget
          campaignHandle={campaignHandle}
          quests={questPages}
          {...shellProps}
        />
      );
    case 'livingThreads':
      return (
        <LivingThreadsWidget
          campaignHandle={campaignHandle}
          bundle={threadBundle}
          {...shellProps}
        />
      );
    case 'party':
    case 'partyRoster':
      return (
        <PartyRosterWidget snapshot={narrativeSnapshot} {...shellProps} />
      );
    case 'campaignPulse':
      return (
        <CampaignPulseWidget pulse={summary.campaignPulse} {...shellProps} />
      );
    case 'lastSessionNotes':
      return (
        <LastSessionNotesWidget
          campaignHandle={campaignHandle}
          lastSession={summary.lastSession}
          {...shellProps}
        />
      );
    case 'quickUtilityNav':
      return (
        <QuickUtilityNav
          campaignHandle={campaignHandle}
          isLookingForGroup={isLookingForGroup}
          config={widget.config}
          onConfigChange={(next) => onWidgetConfigChange(widget.id, next)}
          {...shellProps}
        />
      );
    case 'continueWhereYouLeftOff':
      return (
        <ContinueWhereYouLeftOffWidget
          items={personalizeContinue}
          {...shellProps}
        />
      );
    case 'pinnedItems':
      return (
        <PinnedItemsWidget pinned={personalizePinned} {...shellProps} />
      );
    case 'fantasyCalendar': {
      const viewMode = widget.config?.viewMode;
      const initialViewMode =
        viewMode === 'grid' || viewMode === 'chronicle' ? viewMode : 'grid';
      return (
        <CalendarWidget
          campaignHandle={campaignHandle}
          canManageTime={canManageTime}
          sessionDuration={sessionDuration}
          initialViewMode={initialViewMode}
          {...shellProps}
        />
      );
    }
    case 'worldSnapshot':
      return (
        <WorldSnapshotWidget campaignHandle={campaignHandle} {...shellProps} />
      );
    case 'worldPressureForecast':
      return (
        <WorldPressureForecastWidget
          campaignHandle={campaignHandle}
          preview={summary.worldPressurePreview ?? null}
          nextSession={summary.nextSession}
          nextSessionInDays={summary.campaignPulse.nextSessionInDays}
          {...shellProps}
        />
      );
    case 'campaignAtAGlance':
      return (
        <CampaignAtAGlanceWidget
          snapshot={narrativeSnapshot}
          {...shellProps}
        />
      );
    case 'currentStory':
      return (
        <CurrentStoryWidget snapshot={narrativeSnapshot} {...shellProps} />
      );
    case 'recentActivity':
      return (
        <RecentActivityWidget snapshot={narrativeSnapshot} {...shellProps} />
      );
    case 'explore':
      return (
        <ExploreWidget campaignHandle={campaignHandle} {...shellProps} />
      );
    case 'recentEntities':
      return (
        <RecentEntitiesWidget
          feed={recentEntities}
          config={widget.config}
          onConfigChange={(next) => onWidgetConfigChange(widget.id, next)}
          {...shellProps}
        />
      );
    case 'worldEvents':
      return (
        <WorldEventsWidget
          campaignHandle={campaignHandle}
          feed={worldEvents}
          config={widget.config}
          onConfigChange={(next) => onWidgetConfigChange(widget.id, next)}
          {...shellProps}
        />
      );
    case 'factionsAtWar':
      return (
        <FactionsAtWarWidget
          campaignHandle={campaignHandle}
          feed={factionConflict}
          config={widget.config}
          onConfigChange={(next) => onWidgetConfigChange(widget.id, next)}
          {...shellProps}
        />
      );
    default: {
      const parsed = parsePluginWidgetPlacementId(widget.id);
      if (!parsed) return null;
      return (
        <PluginDashboardWidget
          pluginId={parsed.pluginId}
          widgetId={parsed.widgetId}
          campaignHandle={campaignHandle}
          widgetConfig={widget.config ?? {}}
          customizeMode={customizeMode}
          onHide={shellProps.onHide}
          onConfigChange={(next) => onWidgetConfigChange(widget.id, next)}
        />
      );
    }
  }
}
