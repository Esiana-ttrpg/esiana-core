import assert from 'node:assert/strict';
import test from 'node:test';
import { composeInitialDashboard, meetsDashboardEligibility, parseAnnouncement } from '@shared/dashboardCampaignFeatures';
import { CampaignCapabilities as C } from '@shared/campaignPolicy/capabilities';
import { getDefaultDashboardConfig, normalizeDashboardConfig } from './dashboardConfig';
import { normalizeDashboardConfig as normalizeServer, parseDashboardLayoutPayload } from '../../../backend/src/lib/dashboardConfig';
import { dashboardPresentation } from '@shared/dashboardPresentation';

test('manager/player defaults vary by capability while existing custom geometry and empty layouts survive', () => {
  const original = { widgets: [{ id: 'text', x: 2, y: 1.25, w: 5, h: 2.5, enabled: true, config: { text: 'Our discoveries' } }] };
  const client = normalizeDashboardConfig(original), server = normalizeServer(original);
  assert.deepEqual(client, server); assert.equal(client.layoutMode, 'custom');
  assert.deepEqual(client.widgets.find(row => row.id === 'text'), server.widgets.find(row => row.id === 'text'));
  for (const id of ['campaignMap', 'pageSpotlight', 'campaignAnnouncements', 'needsAttention', 'campaignStatistics']) assert.equal(client.widgets.find(row => row.id === id)?.enabled, false);
  assert.deepEqual(normalizeDashboardConfig({ widgets: [] }).widgets.filter(row => row.enabled), []);
  const defaults = getDefaultDashboardConfig();
  const manager = composeInitialDashboard(defaults.widgets, new Set([C.CAMPAIGN_SETTINGS_EDIT]), true);
  const player = composeInitialDashboard(defaults.widgets, new Set(), true);
  assert.ok(manager.find(row => row.id === 'needsAttention')?.enabled);
  assert.ok(!player.find(row => row.id === 'needsAttention')?.enabled);
  assert.ok(player.find(row => row.id === 'partyRoster')?.enabled);
  assert.equal(parseDashboardLayoutPayload({ ...defaults, layoutMode: 'custom' })?.layoutMode, 'custom');
  assert.equal(parseDashboardLayoutPayload(defaults)?.layoutMode, 'initial');
});
test('eligibility is optional for extensions and capability/member gates combine predictably', () => {
  assert.equal(meetsDashboardEligibility(undefined, new Set(), false), true);
  const requirement = { member: true, all: [C.ASSETS_VIEW] };
  assert.equal(meetsDashboardEligibility(requirement, new Set([C.ASSETS_VIEW]), false), false);
  assert.equal(meetsDashboardEligibility(requirement, new Set(), true), false);
  assert.equal(meetsDashboardEligibility(requirement, new Set([C.ASSETS_VIEW]), true), true);
  assert.ok(dashboardPresentation('sessionClock').eligibility?.member);
});
test('announcement validation rejects unsafe links and ambiguous expiration and retains formatted prose', () => {
  const input = { title: 'A change of date', message: '**Saturday** at 7', style: 'important', link: null, expiresAt: null };
  assert.equal(parseAnnouncement(input)?.message, input.message);
  for (const link of ['javascript:alert(1)', 'data:text/html,bad', 'https://name:secret@example.org', '//example.org']) assert.equal(parseAnnouncement({ ...input, link }), null);
  assert.equal(parseAnnouncement({ ...input, style: 'urgent-danger' }), null);
  assert.equal(parseAnnouncement({ ...input, expiresAt: '2026-11-01T12:00' }), null);
  assert.equal(parseAnnouncement({ ...input, expiresAt: '2026-11-01T12:00:00Z' })?.expiresAt, '2026-11-01T12:00:00.000Z');
});
