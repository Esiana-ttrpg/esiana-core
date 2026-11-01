import type { DashboardConfig, DashboardWidgetPlacement } from './dashboardConfig';

export function dashboardFeedSignature(config: DashboardConfig) {
  return JSON.stringify(config.widgets
    .filter(widget => ['recentEntities', 'worldEvents', 'factionsAtWar', 'campaignMap', 'pageSpotlight', 'campaignAnnouncements', 'needsAttention', 'campaignStatistics'].includes(widget.id))
    .map(widget => [widget.id, widget.enabled, widget.id === 'campaignMap' ? widget.config?.mapId
      : widget.id === 'pageSpotlight' ? widget.config?.pageId : widget.config]));
}

export function moveDashboardWidget(widgets: DashboardWidgetPlacement[], enabled: DashboardWidgetPlacement[], id: string, direction: number, narrow: boolean, heights: Record<string, number>) {
  const ordered = [...enabled].sort((a, b) => a.y - b.y || a.x - b.x);
  const index = ordered.findIndex(widget => widget.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return widgets;
  const first = ordered[index], second = ordered[target];
  if (!narrow) return widgets.map(widget => widget.id === first.id ? { ...widget, x: second.x, y: second.y }
    : widget.id === second.id ? { ...widget, x: first.x, y: first.y } : widget);
  [ordered[index], ordered[target]] = [second, first];
  let row = 0;
  const positions = new Map(ordered.map(widget => {
    const position = [widget.id, row] as const;
    row += heights[widget.id] ? heights[widget.id] / 4 : widget.h;
    return position;
  }));
  return widgets.map(widget => positions.has(widget.id) ? { ...widget, x: 0, y: positions.get(widget.id)! } : widget);
}
