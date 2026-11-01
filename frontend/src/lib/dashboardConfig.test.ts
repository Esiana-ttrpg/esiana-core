import assert from 'node:assert/strict';
import test from 'node:test';
import { getDefaultDashboardConfig, normalizeDashboardConfig } from './dashboardConfig';
import { normalizeDashboardConfig as normalizeServerConfig } from '../../../backend/src/lib/dashboardConfig';

test('server and client agree on defaults and saved presentation preferences', () => {
  assert.deepEqual(getDefaultDashboardConfig(), normalizeServerConfig(null));
  const input = { importManifest: { startingLocationPageId: 'harbor' }, widgets: [
    { id: 'plugin:journal:entry', x: 7, y: 9, w: 5, h: 2, enabled: true, variant: 'featured', autoHeight: true, config: { page: 'one' } },
    { id: 'sessionClock', x: 0, y: 0, w: 4, h: 2, enabled: false },
  ] };
  assert.deepEqual(normalizeDashboardConfig(input), normalizeServerConfig(input));
  assert.equal(normalizeDashboardConfig(input).widgets.filter((widget) => widget.enabled).length, 1);
});

test('existing fixed dimensions and an intentionally empty dashboard survive normalization', () => {
  const input = { widgets: [{ id: 'partyRoster', x: 6, y: 5, w: 6, h: 1, enabled: true }] };
  const party = normalizeDashboardConfig(input).widgets.find((widget) => widget.id === 'partyRoster');
  assert.deepEqual([party?.x, party?.y, party?.w, party?.h, party?.autoHeight], [6, 5, 6, 1, false]);
  assert.equal(normalizeDashboardConfig({ widgets: [] }).widgets.filter((widget) => widget.enabled).length, 0);
});
