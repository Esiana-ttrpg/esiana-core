import { CampaignCapabilities as C, type CampaignCapability } from '@shared/campaignPolicy/capabilities';
import { composeInitialDashboard, meetsDashboardEligibility, type DashboardViewer, type DashboardCampaignFeatures } from '@shared/dashboardCampaignFeatures';
import { DashboardWidgetShell } from './DashboardWidgetShell';
import { CampaignContextWidget, NeedsAttentionWidget, CampaignStatisticsWidget } from './widgets/CampaignContextWidgets';
import { CampaignAnnouncementsWidget } from './widgets/CampaignAnnouncementsWidget';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { dashboardPresentation as corePresentation, normalizeDashboardVariant, type DashboardVariant } from '@shared/dashboardPresentation';
import { DashboardPresentationContext } from './DashboardWidgetShell';
import { useTranslation } from 'react-i18next';
import { fetchDashboardBundle, updateDashboardLayout } from '@/lib/dashboard';
import {
  DASHBOARD_MAX_ENABLED_WIDGETS,
  DASHBOARD_WIDGET_LABELS,
  getDefaultDashboardConfig,
  RETIRED_DASHBOARD_WIDGET_BANK_IDS,
  type DashboardConfig,
  type DashboardBundle,
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
import { DescriptionWidget } from '@/components/dashboard/widgets/DescriptionWidget';
import { TextWidget } from '@/components/dashboard/widgets/TextWidget';
import { HavenDowntimeWidget } from '@/components/dashboard/widgets/HavenDowntimeWidget';
import { getCompositionProfile } from '@/lib/compositionDoctrine';
import {
  buildPluginWidgetPlacementId,
  listLayoutWidgets,
  getLayoutWidget,
  parsePluginWidgetPlacementId,
} from '@/lib/pluginPresentation';
import { PluginDashboardWidget } from '@/components/dashboard/PluginDashboardWidget';
import { SECTION_GAP_CLASS, SURFACE_OPERATIONAL_CLASS } from '@/lib/surfaceLayout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const DASHBOARD_COLS = 12;
// Four render rows exactly preserve one legacy 88px row plus its 16px gap.
// Finer rows let content fit without changing the dimensions of saved layouts.
const DASHBOARD_ROW_SCALE = 4;
const DASHBOARD_ROW_HEIGHT = 10;
const LAYOUT_SAVE_DEBOUNCE_MS = 450;

function dashboardPresentation(id: string) {
  const parsed = parsePluginWidgetPlacementId(id);
  const plugin = parsed ? getLayoutWidget(parsed.pluginId, parsed.widgetId) : undefined;
  return {
    ...corePresentation(id),
    ...(plugin ? {
      minW: plugin.minW ?? plugin.minWidth ?? 2,
      minH: plugin.minH ?? plugin.minHeight ?? 1,
      preferredSpan: plugin.minW ?? plugin.minWidth ?? 6,
      ...plugin.presentation,
    } : {}),
  };
}

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
  campaignDescription: string | null;
  viewer?: DashboardViewer;
  features?: DashboardCampaignFeatures;
  narrativeSnapshot?: CampaignNarrativeSnapshot;
  recentEntities?: RecentEntitiesFeedResult | null;
  worldEvents?: DashboardWorldEventsFeedResult | null;
  factionConflict?: FactionConflictFeedResult | null;
  customizeMode: boolean;
  onConfigChange: (config: DashboardConfig) => void;
  onLayoutSavingChange?: (saving: boolean) => void;
  onWidgetFeedsChange?: (feeds: Pick<DashboardBundle, 'recentEntities' | 'worldEvents' | 'factionConflict' | 'features' | 'viewer'>) => void;
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
  campaignDescription,
  viewer,
  features,
  narrativeSnapshot,
  recentEntities,
  worldEvents,
  factionConflict,
  customizeMode,
  onConfigChange,
  onLayoutSavingChange,
  onWidgetFeedsChange,
}: DashboardGridProps) {
  const { t } = useTranslation();
  const eligible = (id: string) => !viewer || ((!viewer.eligibleWidgetIds.includes(id) && !parsePluginWidgetPlacementId(id)) ? false : meetsDashboardEligibility(dashboardPresentation(id).eligibility, new Set(viewer.capabilities), viewer.isMember));
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(960);
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});
  const narrow = gridWidth < 900;
  const editable = customizeMode && canEditLayout;
  const measureWidget = useCallback((id: string, height: number) => {
    const rows = Math.max(1, Math.ceil((height + 16) / (DASHBOARD_ROW_HEIGHT + 16)));
    setContentHeights((previous) => previous[id] === rows ? previous : { ...previous, [id]: rows });
  }, []);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenerationRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveCountRef = useRef(0);
  const feedSignature = (value: DashboardConfig) => JSON.stringify(value.widgets
    .filter((widget) => ['recentEntities', 'worldEvents', 'factionsAtWar', 'campaignMap', 'pageSpotlight', 'campaignAnnouncements', 'needsAttention', 'campaignStatistics'].includes(widget.id))
    .map((widget) => [widget.id, widget.enabled, widget.config]));
  const loadedFeedsRef = useRef(feedSignature(config));

  const blankDefault = useMemo(() => {
    if (!narrativeSnapshot || summary.nextSession || summary.lastSession || summary.chronometer?.label) return false;
    if (narrativeSnapshot.partyRoster.members.length || narrativeSnapshot.recentActivity.items.length ||
        narrativeSnapshot.currentStory.arcTitle || narrativeSnapshot.currentStory.activeQuest || narrativeSnapshot.currentStory.activeThread) return false;
    const defaults = (viewer ? composeInitialDashboard(getDefaultDashboardConfig().widgets, new Set(viewer.capabilities), viewer.isMember) : getDefaultDashboardConfig().widgets).filter((widget) => widget.enabled);
    const enabled = config.widgets.filter((widget) => widget.enabled);
    return enabled.length === defaults.length && defaults.every((item) => enabled.some((widget) =>
      widget.id === item.id && widget.x === item.x && widget.y === item.y && widget.w === item.w && widget.h === item.h && widget.autoHeight === true));
  }, [config.widgets, narrativeSnapshot, summary, viewer]);

  const enabledWidgets = useMemo(
    () => config.widgets.filter((widget) => widget.enabled && (!blankDefault || customizeMode || widget.id === 'currentStory')),
    [config.widgets, blankDefault, customizeMode],
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
    (nextConfig: DashboardConfig, generation: number) => {
      pendingSaveCountRef.current += 1;
      onLayoutSavingChange?.(true);

      const save = async () => {
        try {
          const saved = await updateDashboardLayout(campaignHandle, nextConfig);
          if (generation === saveGenerationRef.current) {
            onConfigChange(saved);
            const signature = feedSignature(saved);
            if (signature !== loadedFeedsRef.current && onWidgetFeedsChange) {
              const refreshed = await fetchDashboardBundle(campaignHandle);
              if (generation === saveGenerationRef.current) {
                loadedFeedsRef.current = signature;
                onWidgetFeedsChange({ recentEntities: refreshed.recentEntities, worldEvents: refreshed.worldEvents, factionConflict: refreshed.factionConflict, features: refreshed.features, viewer: refreshed.viewer });
              }
            }
          }
        } catch (err) {
          if (generation === saveGenerationRef.current) {
            window.alert(
              err instanceof Error ? err.message : t('campaign.dashboard.layoutSaveFailed'),
            );
          }
        } finally {
          pendingSaveCountRef.current -= 1;
          if (pendingSaveCountRef.current === 0) {
            onLayoutSavingChange?.(false);
          }
        }
      };

      saveQueueRef.current = saveQueueRef.current.then(save, save);
      return saveQueueRef.current;
    },
    [campaignHandle, onConfigChange, onLayoutSavingChange, onWidgetFeedsChange, t],
  );

  const scheduleSave = useCallback(
    (nextConfig: DashboardConfig) => {
      const generation = saveGenerationRef.current + 1;
      saveGenerationRef.current = generation;
      onConfigChange(nextConfig);
      if (!canEditLayout) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persistLayout(nextConfig, generation);
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
      [...enabledWidgets].sort((a, b) => a.y - b.y || a.x - b.x).map((widget, index) => ({
        i: widget.id,
        x: narrow ? 0 : widget.x,
        y: narrow ? index * 10000 : widget.y * DASHBOARD_ROW_SCALE,
        w: narrow || (blankDefault && !customizeMode) ? DASHBOARD_COLS : widget.w,
        h: widget.autoHeight ? contentHeights[widget.id] ?? widget.h * DASHBOARD_ROW_SCALE : widget.h * DASHBOARD_ROW_SCALE,
        minW: dashboardPresentation(widget.id).minW,
        minH: widget.autoHeight ? 1 : dashboardPresentation(widget.id).minH * DASHBOARD_ROW_SCALE,
      })),
    [enabledWidgets, narrow, contentHeights, blankDefault, customizeMode],
  );

  const applyWidgets = useCallback(
    (widgets: DashboardWidgetPlacement[]) => {
      scheduleSave({ ...config, layoutMode: 'custom', widgets });
    },
    [config, scheduleSave],
  );

  const handleLayoutCommit = useCallback(
    (layout: readonly Layout[]) => {
      if (!editable || narrow) return;
      const nextWidgets = config.widgets.map((widget) => {
        if (!widget.enabled) return widget;
        const item = layout.find((entry) => entry.i === widget.id);
        return item
          ? { ...widget, x: item.x, y: item.y / DASHBOARD_ROW_SCALE, w: item.w, h: widget.autoHeight ? widget.h : item.h / DASHBOARD_ROW_SCALE }
          : widget;
      });
      applyWidgets(nextWidgets);
    },
    [applyWidgets, config.widgets, editable, narrow],
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
              ? { ...widget, enabled: true, x: 0, y: nextRow, w: widget.w }
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
      const presentation = dashboardPresentation(widgetId);
      applyWidgets([
        ...config.widgets,
        {
          id: widgetId as DashboardWidgetId,
          x: 0,
          y: nextRow,
          w: presentation.preferredSpan,
          h: layout?.minH ?? layout?.minHeight ?? 3,
          enabled: true,
          variant: presentation.variants.includes('standard') ? 'standard' : presentation.variants[0],
          autoHeight: presentation.contentAware === true,
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

  function changePresentation(widget: DashboardWidgetPlacement, changes: Partial<DashboardWidgetPlacement>) {
    applyWidgets(config.widgets.map((item) => item.id === widget.id ? { ...item, ...changes } : item));
  }

  function moveWidget(widget: DashboardWidgetPlacement, direction: number) {
    const ordered = [...enabledWidgets].sort((a, b) => a.y - b.y || a.x - b.x);
    const index = ordered.findIndex((item) => item.id === widget.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    let row = 0;
    const positions = new Map(ordered.map((item) => {
      const position = [item.id, row] as const;
      row += contentHeights[item.id] ? contentHeights[item.id] / DASHBOARD_ROW_SCALE : item.h;
      return position;
    }));
    applyWidgets(config.widgets.map((item) => positions.has(item.id) ? { ...item, x: 0, y: positions.get(item.id)! } : item));
  }

  return (
    <div className={`flex flex-col ${SECTION_GAP_CLASS}`}>
      <div
        className="relative min-w-0"
      >
        {editable ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <p>{narrow ? 'Use Move earlier / later to reorder on this screen.' : 'Drag to move. Resize to choose width; turn off Fit content to set height.'}</p>
          <button type="button" className="rounded-md border border-border px-3 py-2 text-foreground" onClick={() => {
            if (window.confirm('Reset widgets to the default layout? This replaces your widget choices and keeps your campaign banner.')) {
              applyWidgets(viewer ? composeInitialDashboard(getDefaultDashboardConfig().widgets, new Set(viewer.capabilities), viewer.isMember) : getDefaultDashboardConfig().widgets);
            }
          }}>Reset to Default</button>
        </div> : null}
        <div ref={containerRef} className={`min-w-0 w-full ${getCompositionProfile('dashboard')?.widgetWeightCurve === 'staggered' ? 'dashboard-widget-grid--staggered' : ''}`}>
          <GridLayout
            className={editable ? 'layout' : 'layout dashboard-grid-reading'}
            layout={gridLayout}
            cols={DASHBOARD_COLS}
            rowHeight={DASHBOARD_ROW_HEIGHT}
            width={gridWidth}
            isDraggable={editable && !narrow}
            isResizable={editable && !narrow}
            draggableHandle=".dashboard-drag-handle"
            onDragStop={handleLayoutCommit}
            onResizeStop={handleLayoutCommit}
            margin={[16, 16]}
            useCSSTransforms
          >
            {enabledWidgets.map((widget) => (
              <div key={widget.id} className="min-w-0">
                <MeasuredDashboardWidget widget={widget} onMeasure={measureWidget}>
                {editable ? <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <select aria-label={`Presentation for ${DASHBOARD_WIDGET_LABELS[widget.id] ?? widget.id}`} value={normalizeDashboardVariant(widget.variant) ?? 'standard'} onChange={(event) => changePresentation(widget, { variant: event.target.value as DashboardVariant })} className="rounded border border-border bg-background p-2">
                    {dashboardPresentation(widget.id).variants.map((variant) => <option key={variant} value={variant}>{variant}</option>)}
                  </select>
                  <label className="flex items-center gap-1 p-2"><input type="checkbox" disabled={!dashboardPresentation(widget.id).contentAware} checked={widget.autoHeight === true} onChange={(event) => changePresentation(widget, { autoHeight: event.target.checked })} />Fit content</label>
                  <button type="button" className="p-2 hover:text-foreground" onClick={() => moveWidget(widget, -1)}>Move earlier</button>
                  <button type="button" className="p-2 hover:text-foreground" onClick={() => moveWidget(widget, 1)}>Move later</button>
                </div> : null}
                {eligible(widget.id) ? <DashboardWidgetRenderer
                  viewer={viewer}
                  features={features}
                  widget={widget}
                  campaignHandle={campaignHandle}
                  summary={summary}
                  questPages={questPages}
                  threadBundle={threadBundle}
                  canManageCampaign={canManageCampaign}
                  canManageTime={canManageTime}
                  isLookingForGroup={isLookingForGroup}
                  sessionDuration={sessionDuration}
                  campaignDescription={campaignDescription}
                  narrativeSnapshot={narrativeSnapshot}
                  recentEntities={recentEntities}
                  worldEvents={worldEvents}
                  factionConflict={factionConflict}
                  personalizeContinue={personal?.continueWhereYouLeftOff ?? []}
                  personalizePinned={personal?.pinned ?? []}
                  customizeMode={editable}
                  onHideWidget={hideWidget}
                  onWidgetConfigChange={updateWidgetConfig}
                /> : <DashboardWidgetShell title={DASHBOARD_WIDGET_LABELS[widget.id] ?? 'Widget'} customizeMode={editable} onHide={() => hideWidget(widget.id)}><p className="text-sm text-muted">Unavailable with your current campaign access. This saved placement is retained.</p></DashboardWidgetShell>}
                </MeasuredDashboardWidget>
              </div>
            ))}
          </GridLayout>
        </div>

        {editable ? (
          <aside
            className={`${SURFACE_OPERATIONAL_CLASS} mt-4 rounded-xl border border-border/40 p-4`}
          >
            <h3 className="mb-2 text-sm font-medium text-muted">
              {t('campaign.dashboard.widgetBank')}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...hiddenWidgets].sort((a, b) => dashboardPresentation(a.id).category.localeCompare(dashboardPresentation(b.id).category)).map((widget) => (
                <li key={widget.id}>
                  <button
                    type="button"
                    disabled={!eligible(widget.id)}
                    title={!eligible(widget.id) ? 'Unavailable with your current campaign access' : undefined}
                    onClick={() => restoreWidget(widget.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-2 py-2 text-left text-xs text-foreground hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="size-3.5 shrink-0" />
                    <span><span className="mb-1 block text-muted">{dashboardPresentation(widget.id).category}</span>{translateDashboardWidgetLabel(
                      widget.id as DashboardWidgetId,
                      DASHBOARD_WIDGET_LABELS[widget.id as DashboardWidgetId] ??
                        parsePluginWidgetPlacementId(widget.id)?.widgetId ??
                        widget.id,
                    )}<span className="mt-1 block text-muted">{dashboardPresentation(widget.id).description}</span>{!eligible(widget.id) && <span className="mt-1 block text-muted">Unavailable with your current campaign access.</span>}<span className="mt-1 block text-muted">{dashboardPresentation(widget.id).variants.join(' · ')}</span></span>
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
                      disabled={!eligible(buildPluginWidgetPlacementId(entry.pluginId, entry.id))}
                      title={!eligible(buildPluginWidgetPlacementId(entry.pluginId, entry.id)) ? 'Unavailable with your current campaign access' : undefined}
                      onClick={() =>
                        restoreWidget(
                          buildPluginWidgetPlacementId(entry.pluginId, entry.id) as DashboardWidgetId,
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-2 py-2 text-left text-xs text-foreground hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="size-3.5 shrink-0" />
                      <span>
                        {entry.title}
                        <span className="mt-1 block text-muted">{entry.presentation?.description}</span>
                        <span className="mt-1 block text-muted">{dashboardPresentation(buildPluginWidgetPlacementId(entry.pluginId, entry.id)).variants.join(' · ')}</span>
                      </span>
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

function MeasuredDashboardWidget({ widget, onMeasure, children }: {
  widget: DashboardWidgetPlacement;
  onMeasure: (id: string, height: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!widget.autoHeight || !ref.current) return;
    const node = ref.current;
    const observer = new ResizeObserver(() => onMeasure(widget.id, node.getBoundingClientRect().height));
    observer.observe(node);
    return () => observer.disconnect();
  }, [widget.id, widget.autoHeight, onMeasure]);
  const presentation = dashboardPresentation(widget.id);
  const requested = normalizeDashboardVariant(widget.variant) ?? 'standard';
  const variant = presentation.variants.includes(requested) ? requested : 'standard';
  return <DashboardPresentationContext.Provider value={{ variant, autoHeight: widget.autoHeight === true }}>
    <div ref={ref} className={`min-w-0 ${widget.autoHeight ? '' : 'flex h-full min-h-0 flex-col'}`}>{children}</div>
  </DashboardPresentationContext.Provider>;
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
  campaignDescription: string | null;
  viewer?: DashboardViewer;
  features?: DashboardCampaignFeatures;
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
  campaignDescription,
  features,
  viewer,
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

  const allowed = (cap: CampaignCapability) => viewer ? viewer.capabilities.includes(cap) : canManageCampaign;
  const contextProps = { id: widget.id, campaignHandle, features, config: widget.config, ...shellProps, onConfigChange: (value: Record<string, unknown>) => onWidgetConfigChange(widget.id, value) };
  switch (widget.id) {
    case 'campaignMap':
    case 'pageSpotlight':
      return <CampaignContextWidget {...contextProps} />;
    case 'campaignAnnouncements':
      return <CampaignAnnouncementsWidget {...contextProps} />;
    case 'needsAttention':
      return <NeedsAttentionWidget {...contextProps} />;
    case 'campaignStatistics':
      return <CampaignStatisticsWidget {...contextProps} />;
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
          canConfigure={allowed(C.CAMPAIGN_SETTINGS_EDIT)}
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
        <WorldSnapshotWidget snapshot={narrativeSnapshot} eraName={summary.worldPressurePreview?.eraName} {...shellProps} />
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
        <CurrentStoryWidget snapshot={narrativeSnapshot} campaignHandle={campaignHandle} canManageCampaign={allowed(C.CAMPAIGN_SETTINGS_EDIT)} canCreatePages={allowed(C.PAGE_CREATE)} canScheduleSessions={allowed(C.NOTES_MODERATE)} {...shellProps} />
      );
    case 'recentActivity':
      return (
        <RecentActivityWidget snapshot={narrativeSnapshot} {...shellProps} />
      );
    case 'explore':
      return (
        <ExploreWidget campaignHandle={campaignHandle} {...shellProps} />
      );
    case 'description':
      return <DescriptionWidget description={campaignDescription} {...shellProps} />;
    case 'text':
      return (
        <TextWidget
          config={widget.config}
          onConfigChange={(next) => onWidgetConfigChange(widget.id, next)}
          {...shellProps}
        />
      );
    case 'havenDowntime':
      return <HavenDowntimeWidget campaignHandle={campaignHandle} {...shellProps} />;
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
