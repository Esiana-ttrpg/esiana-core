import { fetchLastDashboardSession } from './buildDashboardSessions.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma.js';
import { audioContext } from './audioCore.js';
import { dashboardMaps, dashboardSpotlight } from './dashboardContent.js';
import { buildCampaignStatistics } from './stats/buildCampaignStatistics.js';
import { dashboardActions } from './dashboardActions.js';
import { campaignAnnouncements } from './campaignAnnouncements.js';
import { buildOperationalPayload, restoreOperationalPayload } from './campaignExport/sovereignOperational.js';
import { setContentPresenceState } from './contentPresenceService.js';
import { ContentPresenceEntityType as E } from '../../../shared/contentPresence.js';
import { hashApiToken } from './apiToken.js';
import { defaultJsonBody } from '../middleware/jsonBody.js';
import { campaignScopedRouter } from '../routes/campaignScoped.js';
import type { DashboardSummary } from './buildDashboardSummary.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { invalidateCampaignCapabilityOverrideCache } from './campaignScopeContext.js';

test('campaign context widgets enforce canonical visibility, durable notices, workflow state, and aggregate access',
  { skip: process.env.SESSION_AUDIO_TEST_DATABASE !== '1' }, async t => {
    const stamp = randomUUID();
    const owner = await prisma.user.create({ data: { email: `context-owner-${stamp}@example.invalid` } });
    const player = await prisma.user.create({ data: { email: `context-player-${stamp}@example.invalid` } });
    const campaign = await prisma.campaign.create({ data: { name: 'Glasswater context', handle: `context-${stamp}`, campaignOwnerUserId: owner.id,
      currentEpochMinute: 1000n, members: { create: [{ userId: owner.id, role: 'GAMEMASTER' }, { userId: player.id, role: 'PARTICIPANT' }] } } });
    const other = await prisma.campaign.create({ data: { name: 'Elsewhere', handle: `other-context-${stamp}`, campaignOwnerUserId: owner.id } });
    const ctx = await audioContext(campaign.id, player.id), manager = await audioContext(campaign.id, owner.id);
    const tokens = await Promise.all([owner, player].map(async user => { const raw = randomUUID(); await prisma.userToken.create({ data: { userId: user.id, name: 'Context test', expiresAt: new Date(Date.now() + 3600000), tokenHash: hashApiToken(raw), scopes: ['campaign:read', 'campaign:write'] } }); return raw; }));
    const app = express(); app.use(defaultJsonBody); app.use(cookieParser()); app.use('/api/campaigns/:campaignHandle', campaignScopedRouter);
    const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/campaigns/${campaign.handle}`;
    const request = (token: string, path: string, method = 'GET', body?: unknown) => fetch(origin + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Glasswater', visibility: 'Party', templateType: 'LOCATION', blocks: [{ id: 'body', type: 'text-tiptap', content: { markdown: 'A city of bridges.' } }, { id: 'secret', type: 'text-tiptap', isPrivate: true, content: { markdown: 'Secret council.' } }] } });
    try {
      await t.test('spotlight follows canonical changes and rejects private, deleted, foreign, or temporally gated pages', async () => {
        const visible = await dashboardSpotlight(ctx, page.id);
        assert.equal(visible?.title, 'Glasswater'); assert.match(visible?.excerpt ?? '', /bridges/); assert.ok(!JSON.stringify(visible).includes('Secret council'));
        await prisma.wikiPage.update({ where: { id: page.id }, data: { title: 'New Glasswater', pathKey: 'new-glasswater' } });
        assert.equal((await dashboardSpotlight(ctx, page.id))?.title, 'New Glasswater');
        const foreign = await prisma.wikiPage.create({ data: { campaignId: other.id, title: 'Foreign secret', visibility: 'Public' } });
        assert.equal(await dashboardSpotlight(ctx, foreign.id), null);
        await setContentPresenceState({ campaignId: campaign.id, entityType: E.WIKI_PAGE, entityId: page.id, state: 'REVEALED', availableFromEpochMinute: 2000n });
        assert.equal(await dashboardSpotlight(ctx, page.id), null);
        await setContentPresenceState({ campaignId: campaign.id, entityType: E.WIKI_PAGE, entityId: page.id, state: 'REVEALED', availableFromEpochMinute: null });
        await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: 'DM_Only' } });
        assert.equal(await dashboardSpotlight(ctx, page.id), null); assert.ok(await dashboardSpotlight(manager, page.id));
        await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: 'Party', deletedAt: new Date() } });
        assert.equal(await dashboardSpotlight(ctx, page.id), null);
        await prisma.wikiPage.update({ where: { id: page.id }, data: { deletedAt: null } });
      });
      await t.test('map uses an existing thumbnail only and never returns layers or full-size files', async () => {
        const map = await prisma.asset.create({ data: { campaignId: campaign.id, type: 'map', url: '/uploads/full-secret.png', displayName: 'Glasswater map', visibility: 'Party' } });
        assert.equal((await dashboardMaps(ctx, map.id)).preview?.imageUrl, null);
        await prisma.asset.update({ where: { id: map.id }, data: { thumbnailUrl: '/uploads/preview.png' } });
        const result = await dashboardMaps(ctx, map.id);
        assert.equal(result.preview?.imageUrl, `/api/assets/${map.id}?variant=thumb`); assert.ok(!JSON.stringify(result).includes('full-secret'));
        await prisma.wikiPage.update({ where: { id: page.id }, data: { mapAssetId: map.id, visibility: 'DM_Only' } });
        assert.equal((await dashboardMaps(ctx, map.id, true)).preview, null);
        assert.equal((await dashboardMaps(ctx, map.id, true)).options.length, 0);
        await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: 'Party' } });
      });
      await t.test('notices require manager permission, validate input, detect conflicts, expire, and survive export/restore', async () => {
        const input = { title: 'Bring a discovery', message: '**Share** a place you want to explore.', style: 'update', link: 'https://example.org/guide', expiresAt: null };
        assert.equal((await request(tokens[1], '/dashboard/announcements', 'POST', input)).status, 403);
        assert.equal((await request(tokens[0], '/dashboard/announcements', 'POST', { ...input, link: 'javascript:alert(1)' })).status, 400);
        const created = await request(tokens[0], '/dashboard/announcements', 'POST', input); assert.equal(created.status, 201);
        const row = (await created.json()).announcements[0];
        assert.equal((await request(tokens[1], '/dashboard/announcements')).status, 403);
        assert.equal((await request(tokens[0], `/dashboard/announcements/${row.id}`, 'PATCH', { ...input, expectedUpdatedAt: '2000-01-01T00:00:00Z' })).status, 409);
        assert.equal((await request(tokens[0], `/dashboard/announcements/${row.id}`, 'PATCH', { ...input, title: 'Updated notice', expectedUpdatedAt: row.updatedAt })).status, 200);
        const backup = await buildOperationalPayload(campaign.id);
        assert.equal(backup.campaignAnnouncements?.length, 1);
        await assert.rejects(restoreOperationalPayload(other.id, { downtimeHavens: [], downtimeProjects: [], pluginData: [], campaignAnnouncements: backup.campaignAnnouncements }), /another record/);
        assert.equal((await campaignAnnouncements(campaign.id))[0].title, 'Updated notice');
        assert.equal((await request(tokens[0], `/dashboard/announcements/${row.id}`, 'DELETE')).status, 204);
        await restoreOperationalPayload(campaign.id, { downtimeHavens: [], downtimeProjects: [], pluginData: [], campaignAnnouncements: backup.campaignAnnouncements });
        assert.equal((await campaignAnnouncements(campaign.id)).length, 1);
        const restored = (await campaignAnnouncements(campaign.id))[0];
        assert.equal((await request(tokens[0], `/dashboard/announcements/${restored.id}`, 'PATCH', { ...input, expiresAt: '2000-01-01T00:00:00Z', expectedUpdatedAt: restored.updatedAt })).status, 200);
        assert.equal((await campaignAnnouncements(campaign.id)).length, 0);
        assert.equal((await campaignAnnouncements(campaign.id, true)).length, 1);
      });
      await t.test('statistics count authorized records, compare equal periods, and invalidate cached totals on access changes', async () => {
        const anchor = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: page.id, authorId: owner.id, sequenceOrder: 1 } });
        await prisma.campaignSessionSchedule.create({ data: { timelinePointId: anchor.id, status: 'COMPLETED', plannedStartAt: new Date(Date.now() - 86400000) } });
        const stats = await buildCampaignStatistics(ctx, 30);
        assert.deepEqual(stats.metrics.find(row => row.id === 'sessions')?.value, { status: 'value', amount: 1 });
        assert.deepEqual(stats.metrics.find(row => row.id === 'sessions')?.previous, { status: 'zero', amount: 0 });
        assert.equal(stats.metrics.find(row => row.id === 'playedDuration')?.value.status, 'unavailable');
        await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: 'DM_Only' } });
        assert.deepEqual((await buildCampaignStatistics(ctx, 30)).metrics.find(row => row.id === 'sessions')?.value, { status: 'zero', amount: 0 });
        assert.deepEqual((await buildCampaignStatistics(manager, 30)).metrics.find(row => row.id === 'sessions')?.value, { status: 'value', amount: 1 });
        assert.equal((await request(tokens[1], '/campaign-statistics?days=12')).status, 400);
        const legacy = await (await request(tokens[1], '/world-stats')).json();
        assert.equal(legacy.snapshot['snapshot.totalWords'].status, 'unavailable');
        await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: 'Party' } });
      });
      await t.test('attention removes an RSVP after response and keeps note suggestions optional', async () => {
        const timeline = await prisma.campaignSessionTimeline.findFirstOrThrow({ where: { campaignId: campaign.id } });
        const summary = { nextSession: { timelinePointId: timeline.id, title: 'Across the Glasswater', plannedStartAt: new Date(Date.now() + 86400000).toISOString() }, lastSession: { timelinePointId: timeline.id, followUp: { myNotes: { state: 'not_added', canEdit: true, href: '/notes/mine' }, media: null } } } as DashboardSummary;
        const before = await dashboardActions(ctx, player.id, summary);
        assert.equal(before[0].optional, false); assert.equal(before.find(row => row.id.startsWith('notes:'))?.optional, true);
        await prisma.sessionAttendance.create({ data: { timelinePointId: timeline.id, userId: player.id, status: 'ATTENDING' } });
        assert.ok(!(await dashboardActions(ctx, player.id, summary)).some(row => row.id.startsWith('rsvp:')));
      });
      await t.test('bundle refresh delivers enabled features without changing customized placements', async () => {
        const map = await prisma.asset.findFirstOrThrow({ where: { campaignId: campaign.id, type: 'map' } });
        await prisma.campaign.update({ where: { id: campaign.id }, data: { dashboardConfig: { layoutMode: 'custom', widgets: [
          { id: 'pageSpotlight', enabled: true, x: 2, y: 1.25, w: 7, h: 2.5, config: { pageId: page.id, introduction: 'Our next chapter' } },
          { id: 'campaignStatistics', enabled: true, x: 0, y: 4, w: 5, h: 3 },
          { id: 'needsAttention', enabled: true, x: 5, y: 4, w: 5, h: 3 },
          { id: 'campaignMap', enabled: true, x: 0, y: 7, w: 7, h: 3, config: { mapId: map.id } },
        ] } } });
        const response = await request(tokens[1], '/dashboard');
        const bundle = await response.json();
        assert.equal(response.status, 200, JSON.stringify(bundle));
        assert.equal(bundle.features.spotlight.title, 'New Glasswater');
        assert.equal(bundle.dashboardConfig.widgets.find((row: { id: string }) => row.id === 'pageSpotlight').y, 1.25);
        assert.equal(bundle.features.statistics.days, 30);
        assert.ok(bundle.viewer.eligibleWidgetIds.includes('pageSpotlight'));
        assert.equal(bundle.features.map.id, map.id);
        await prisma.campaignRoleCapabilityOverride.create({ data: { campaignId: campaign.id, role: 'PARTICIPANT', capability: C.ASSETS_VIEW, effect: 'REVOKE' } });
        invalidateCampaignCapabilityOverrideCache(campaign.id);
        const revoked = await (await request(tokens[1], '/dashboard')).json();
        assert.equal(revoked.features.map, null);
        assert.ok(!revoked.viewer.eligibleWidgetIds.includes('campaignMap'));
        assert.equal(revoked.dashboardConfig.widgets.find((row: { id: string }) => row.id === 'campaignMap').enabled, true);
        await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: 'DM_Only' } });
        const privateBundle = await (await request(tokens[1], '/dashboard')).json();
        assert.equal(privateBundle.features.spotlight, null);
        assert.ok(!JSON.stringify(privateBundle.dashboardConfig).includes('Our next chapter'));
        const saved = (await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).dashboardConfig as { widgets: { config?: { introduction?: string } }[] };
        assert.equal(saved.widgets[0].config?.introduction, 'Our next chapter');
      });
      await t.test('world pressure includes the authorized PARTY session forecast', async () => {
        const upcoming = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Across the islands', visibility: 'Party' } });
        const timeline = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: upcoming.id, authorId: owner.id, sequenceOrder: 2 } });
        await prisma.campaignSessionSchedule.create({ data: { timelinePointId: timeline.id, status: 'PUBLISHED', plannedStartAt: new Date(Date.now() + 3 * 86400000) } });
        await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'The Lantern Council', visibility: 'DM_Only', metadata: { entityCategory: 'organizations', worldState: 'rising', currentPressures: ['Expeditions return from the islands'] } } });
        const response = await request(tokens[0], '/world-pressure');
        const body = await response.json();
        assert.equal(response.status, 200, JSON.stringify(body));
        assert.equal(body.projection.projectedByNextSession?.daysUntil, 3);
        assert.equal((await request(tokens[1], '/world-pressure')).status, 403);
      });
      await t.test('existing schedule PATCH explicitly completes a session before Last Session reads it', async () => {
        const timeline = await prisma.campaignSessionTimeline.findFirstOrThrow({ where: { campaignId: campaign.id, wikiPageId: page.id } });
        await prisma.campaignSessionSchedule.update({ where: { timelinePointId: timeline.id }, data: { status: 'PUBLISHED' } });
        const path = `/session-timeline/${timeline.id}/schedule`;
        assert.equal((await request(tokens[1], path, 'PATCH', { status: 'COMPLETED' })).status, 403);
        assert.equal((await request(tokens[0], path, 'PATCH', { status: 'COMPLETED' })).status, 200);
        assert.equal((await prisma.campaignSessionSchedule.findUniqueOrThrow({ where: { timelinePointId: timeline.id } })).status, 'COMPLETED');
        assert.equal((await fetchLastDashboardSession(campaign.id, manager.role))?.timelinePointId, timeline.id);
      });
      await t.test('an optional widget read failure does not reject the dashboard bundle', async () => {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { dashboardConfig: { layoutMode: 'custom', widgets: [
          { id: 'campaignAnnouncements', enabled: true, x: 0, y: 0, w: 6, h: 3 },
          { id: 'pageSpotlight', enabled: true, x: 6, y: 0, w: 6, h: 3, config: { pageId: page.id } },
        ] } } });
        const delegate = prisma.dashboardWidget;
        const original = delegate.findMany;
        Object.defineProperty(delegate, 'findMany', { configurable: true, writable: true, value: async () => { throw new Error('Fixture unavailable'); } });
        try {
          const response = await request(tokens[0], '/dashboard');
          const bundle = await response.json();
          assert.equal(response.status, 200, JSON.stringify(bundle));
          assert.deepEqual(bundle.features.announcements, []);
          assert.equal(bundle.features.spotlight.id, page.id);
          assert.ok(bundle.summary);
        } finally { Object.defineProperty(delegate, 'findMany', { configurable: true, writable: true, value: original }); }
      });
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
      await prisma.campaign.deleteMany({ where: { id: { in: [campaign.id, other.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [owner.id, player.id] } } });
      await prisma.$disconnect();
    }
  });
