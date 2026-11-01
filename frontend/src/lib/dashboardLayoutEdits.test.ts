import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardFeedSignature, moveDashboardWidget } from './dashboardLayoutEdits';
import { getDefaultDashboardConfig, type DashboardWidgetPlacement } from './dashboardConfig';

const widgets: DashboardWidgetPlacement[] = [
  { id: 'currentStory', enabled: true, x: 0, y: 0, w: 7, h: 3 },
  { id: 'partyRoster', enabled: true, x: 7, y: 0, w: 5, h: 2 },
  { id: 'text', enabled: true, x: 7, y: 2, w: 5, h: 2.5 },
  { id: 'description', enabled: false, x: 3, y: 9, w: 6, h: 4 },
];
test('desktop movement swaps adjacent positions and retains all other geometry and settings', () => {
  const moved = moveDashboardWidget(widgets, widgets.filter(row => row.enabled), 'partyRoster', 1, false, {});
  assert.deepEqual(moved.map(row => [row.id, row.x, row.y]), [
    ['currentStory', 0, 0], ['partyRoster', 7, 2], ['text', 7, 0], ['description', 3, 9],
  ]);
  assert.equal(moved[1].w, 5); assert.equal(moved[1].h, 2);
  assert.equal(moved[2].h, 2.5); assert.equal(moved[0], widgets[0]); assert.equal(moved[3], widgets[3]);
  assert.equal(moveDashboardWidget(widgets, widgets.slice(0, 3), 'currentStory', -1, false, {}), widgets);
});
test('narrow movement preserves stacking and measured quarter-row heights', () => {
  const moved = moveDashboardWidget(widgets, widgets.slice(0, 3), 'partyRoster', 1, true, { currentStory: 5 });
  assert.deepEqual(moved.slice(0, 3).map(row => [row.id, row.x, row.y]), [
    ['currentStory', 0, 0], ['partyRoster', 0, 3.75], ['text', 0, 1.25],
  ]);
  assert.equal(moved[3], widgets[3]);
});
test('feed signature ignores prose and geometry but tracks references, enabled states, and other feed settings', () => {
  const config = getDefaultDashboardConfig();
  config.widgets = [
    { ...widgets[0], id: 'campaignMap', config: { mapId: 'map-a', description: 'Coast' } },
    { ...widgets[1], id: 'pageSpotlight', config: { pageId: 'page-a', introduction: 'Our next chapter' } },
    { ...widgets[2], id: 'recentEntities', config: { limit: 3 } },
  ];
  const signature = dashboardFeedSignature(config);
  const changed = structuredClone(config);
  changed.widgets[0].config!.description = 'Updated prose'; changed.widgets[0].x = 3;
  changed.widgets[1].config!.introduction = 'A different introduction';
  assert.equal(dashboardFeedSignature(changed), signature);
  for (const [index, key, value] of [[0, 'mapId', 'map-b'], [1, 'pageId', 'page-b'], [2, 'limit', 5]] as const) {
    const next = structuredClone(config); next.widgets[index].config![key] = value;
    assert.notEqual(dashboardFeedSignature(next), signature);
  }
  changed.widgets[0].enabled = false;
  assert.notEqual(dashboardFeedSignature(changed), signature);
});
