import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { buildCampaignContext } from './campaignScopeContext.js';
import { buildCampaignNarrativeFeed, type CampaignFeedOptions } from './campaignNarrativeFeed.js';
import { buildConvergenceOverlay } from './chronologyConvergenceService.js';

if (process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL) {
  process.env.DATABASE_PROVIDER = 'sqlite'; process.env.DATABASE_URL = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL; process.env.NODE_ENV = 'test';
}
test('campaign feed: real sources, authorizations, excerpts, recurrence, progression audit, ranges, and legacy opt-out', async t => {
  const stamp = randomUUID();
  const user = await prisma.user.create({ data: { email: `feed-${stamp}@example.test`, passwordHash: 'test' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Feed fixture', handle: `feed-${stamp}`, campaignOwnerUserId: user.id, currentEpochMinute: 30n * 1440n + 123n } });
  t.after(async () => { await prisma.campaign.delete({ where: { id: campaign.id } }); await prisma.user.delete({ where: { id: user.id } }); await prisma.$disconnect(); });
  const context = (role: 'GAMEMASTER' | 'PARTICIPANT') => buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: user.id,
    discoverability: 'PRIVATE', userId: role === 'GAMEMASTER' ? user.id : 'reader', membershipRole: role, allowPlayerChronologyManagement: false, chronologyContributor: false, partyId: null });
  const gm = await context('GAMEMASTER'), player = await context('PARTICIPANT');
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'World', isMasterTime: true, epochOffset: 123n,
    weekdays: [{ name: 'Dawn', length: 1 }], months: [{ name: 'Rain', length: 40 }], leapDays: [], moons: [], seasons: [] } });
  const first = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Mira reaches the archive', targetYear: 1, targetMonth: 0, targetDay: 20, importance: 'NOTICE', visibility: 'PARTY', duration: 3, isRepeating: true, repeatUnit: 'DAYS', repeatInterval: 2, limitRepetitions: 3 } });
  const secret = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Hidden council', targetEpochMinute: 25n * 1440n, visibility: 'DM_ONLY' } });
  await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'No fictional date', visibility: 'PARTY' } });
  await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Future precise event', targetEpochMinute: campaign.currentEpochMinute + 1n, visibility: 'PARTY' } });
  const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Session discovery', templateType: 'SESSION_NOTE', visibility: 'Party',
    metadata: { isSessionAnchor: true, fantasyEpochMinute: String(18n * 1440n + 123n) },
    blocks: [{ id: 'session-note-body', visibility: 'Party', isPrivate: false, content: { markdown: 'Mira discovered the archive. '.repeat(40) } }, { id: 'transcript', content: { markdown: 'TRANSCRIPT SECRET' } }] } });
  await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: page.id, authorId: user.id, sequenceOrder: 1 } });
  const hiddenPage = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Private session', visibility: 'DM_Only', metadata: { isSessionAnchor: true, fantasyEpochMinute: '123' }, blocks: [{ id: 'session-note-body', content: { markdown: 'PRIVATE NOTES' } }] } });
  await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: hiddenPage.id, authorId: user.id, sequenceOrder: 0 } });
  await prisma.campaignWorldEventSuggestion.create({ data: { campaignId: campaign.id, status: 'accepted', kind: 'faction_pressure', title: 'Accepted source', occurredAtEpochMinute: 10n, sourceRef: 'fixture', idempotencyKey: stamp, acceptedCalendarEventId: first.id } });
  await prisma.campaignWorldEventSuggestion.create({ data: { campaignId: campaign.id, status: 'accepted', kind: 'faction_pressure', title: 'Unsupported outcome', occurredAtEpochMinute: 10n, sourceRef: 'fixture', idempotencyKey: stamp + '-gap' } });
  const category = await prisma.calendarEventCategory.create({ data: { campaignId: campaign.id, name: 'World advance' } });
  const batch = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, categoryId: category.id, visibility: 'PARTY', title: 'Recorded world changes', targetEpochMinute: 25n * 1440n + 123n,
    description: JSON.stringify({ version: 'world-advance-v1', batchId: stamp, actorUserId: user.id, previousEpochMinute: '123', nextEpochMinute: String(25n * 1440n + 123n), appliedCount: 2, skippedCount: 0,
      effects: [{ id: 'public-effect', type: 'economic_signal', domain: 'economic', targetKind: 'location', pageId: page.id, signal: 'surplus', note: 'Public trade returned.' },
        { id: 'private-effect', type: 'economic_signal', domain: 'economic', targetKind: 'location', pageId: hiddenPage.id, signal: 'scarcity', note: 'SECRET EFFECT' }] }) } });
  for (const effectId of ['public-effect', 'private-effect']) await prisma.worldAdvanceReceipt.create({ data: { campaignId: campaign.id, batchId: stamp, effectId, idempotencyKey: `${stamp}:${effectId}`, chronologyEventId: batch.id } });
  const projectPage = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Coastal archive research', visibility: 'Party' } });
  const project = await prisma.downtimeProject.create({ data: { campaignId: campaign.id, wikiPageId: projectPage.id, status: 'COMPLETED', completedAtEpochMinute: 26n * 1440n + 123n } });
  const options: CampaignFeedOptions = { order: 'desc', importance: ['MAJOR', 'MINOR', 'NOTICE'], includeFuture: false, domains: null, sessionLinkedOnly: false };
  const result = await buildCampaignNarrativeFeed(player, options);
  assert.ok(result.feed); assert.equal(result.feed.requestedRange.mode, 'EPOCH_RANGE');
  const json = JSON.stringify(result);
  assert.ok(!json.includes('Hidden council')); assert.ok(!json.includes('PRIVATE NOTES')); assert.ok(!json.includes('TRANSCRIPT SECRET'));
  assert.ok(!json.includes('SECRET EFFECT')); assert.equal(result.entries.filter(row => row.source.entityId === batch.id).length, 1);
  assert.ok(result.entries.some(row => row.entryId === `project-outcome:${project.id}` && row.instant.epochMinute === String(project.completedAtEpochMinute)));
  assert.ok(!json.includes('Future precise event'));
  assert.equal(result.entries.filter(row => row.source.entityId === first.id).length, 3);
  assert.equal(result.entries.find(row => row.display.title === 'No fictional date')?.instant.epochMinute, null);
  const summary = result.entries.find(row => row.domain === 'session_chronicle')!.display.summary!;
  assert.ok(summary.length <= 400);
  const dated = result.entries.flatMap(row => row.instant.epochMinute === null ? [] : [BigInt(row.instant.epochMinute)]);
  assert.deepEqual(dated, [...dated].sort((a, b) => a > b ? -1 : a < b ? 1 : 0));
  const elevated = await buildCampaignNarrativeFeed(gm, options);
  assert.ok(elevated.entries.some(row => row.source.entityId === secret.id));
  assert.equal(elevated.entries.filter(row => row.source.entityId === batch.id).length, 2);
  assert.ok(elevated.entries.filter(row => row.source.entityId === first.id).every(row => row.feed?.originLabel === 'Progression'));
  assert.ok(elevated.feed!.gaps.some(gap => gap.includes('lack a supported')));
  const earlier = await buildCampaignNarrativeFeed(player, { ...options, from: '123', to: String(20n * 1440n + 123n) });
  assert.deepEqual(earlier.feed!.requestedRange, { mode: 'EPOCH_RANGE', from: '123', to: String(20n * 1440n + 123n) });
  assert.equal(earlier.entries.filter(row => row.source.entityId === first.id).length, 1);
  assert.ok((await buildCampaignNarrativeFeed(player, { ...options, includeFuture: true })).entries.some(row => row.display.title === 'Future precise event'));
  assert.equal((await buildCampaignNarrativeFeed(player, { ...options, domains: [] })).entries.length, 0);
  const legacy = await buildConvergenceOverlay({ campaignId: campaign.id, campaignHandle: campaign.handle, role: 'GAMEMASTER', allowPlayerChronologyManagement: false, window: { mode: 'YEAR_RANGE', from: '0', to: '9999' }, domains: ['world_event'], includeSuppressed: false, sessionLinkedOnly: false });
  assert.equal(legacy.feed, undefined);
  assert.ok(legacy.entries.length > elevated.entries.filter(row => row.domain === 'world_event').length);
  const ancient = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Ancient recorded discovery', targetEpochMinute: 123n, visibility: 'PARTY' } });
  await prisma.calendarEvent.createMany({ data: Array.from({ length: 2005 }, (_, index) => ({ calendarId: calendar.id, title: `Later record ${index}`, targetEpochMinute: 100n * 1440n + 123n, visibility: 'PARTY' })) });
  const boundedEarlier = await buildCampaignNarrativeFeed(player, { ...options, from: '123', to: '1563' });
  assert.ok(boundedEarlier.entries.some(row => row.source.entityId === ancient.id));
  assert.ok(!boundedEarlier.entries.some(row => row.display.title.startsWith('Later record')));
  const capped = await buildCampaignNarrativeFeed(player, { ...options, from: '0', to: String(101n * 1440n), includeFuture: true });
  assert.ok(capped.feed!.sourceWarnings.some(row => row.code === 'SOURCE_TRUNCATED'));
  assert.ok(capped.truncation.capped);
  assert.equal(capped.entries.filter(row => row.instant.epochMinute !== null).length, 2000);
});
