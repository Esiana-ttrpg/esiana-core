import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { buildCampaignContext } from './campaignScopeContext.js';
import {
  ensureChronologyWikiWorkspaces,
  initializeChronologyWorkspaces,
  initializeExistingChronologyWorkspaces,
  repairChronologyWikiWorkspacesForCampaign,
} from './chronologyWikiWorkspace.js';
import { linkChronologyPage } from '../controllers/chronologyPagesController.js';
import { createWikiPage, getCategoryIndex, getWikiPageByWorkspacePath } from '../controllers/wikiController.js';
import { deleteCalendarEvent } from '../controllers/calendarEventsController.js';
import { saveChronologyEra, deleteChronologyEra } from './chronologyEraService.js';
import { resolveWikiPageByPathKey } from './wikiPathKeyService.js';
import { resolveCanonicalPagePath } from '../../../shared/campaignWorkspaceRoutes.js';
import { buildSearchQueryParts, emptyStructuredFilters } from './search/searchContext.js';
import { searchCampaign } from './search/searchService.js';

if (process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL) {
  process.env.DATABASE_PROVIDER = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL.startsWith('file:') ? 'sqlite' : 'postgresql';
  process.env.DATABASE_URL = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
}

test('authored chronology documents use the existing wiki workspaces and survive lifecycle changes', async t => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `workspace-${stamp}@example.test`, passwordHash: 'test' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Florence', handle: `workspace-${stamp}`, campaignOwnerUserId: owner.id } });
  t.after(async () => {
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  });
  const context = (role: 'GAMEMASTER' | 'PARTICIPANT') => buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id,
    discoverability: 'PRIVATE', userId: role === 'GAMEMASTER' ? owner.id : 'member-player', membershipRole: role, allowPlayerChronologyManagement: false, partyId: null });
  const gm = await context('GAMEMASTER'), player = await context('PARTICIPANT');
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'Florence', months: [{ name: 'Harvestmoon', length: 30, type: 'standard' }], weekdays: [], seasons: [], moons: [], leapDays: [] } });
  const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Moonrise Celebration', visibility: 'PUBLIC' } });
  const era = await saveChronologyEra(gm, { calendarId: calendar.id, name: 'Ember Age', visibility: 'PUBLIC', startDate: null, endDate: null, isCurrent: false });
  await repairChronologyWikiWorkspacesForCampaign(campaign.id);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), 0, 'page-free records do not create wiki documents or folders');
  const seededEvents = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Events', visibility: 'Party', metadata: { seeded: true } } });

  const blocks = [{ id: 'original-prose', type: 'text-tiptap', title: 'Account', content: { markdown: 'Moonrise chronicle, with an unchanged citation.' } }];
  const legacy = await prisma.wikiPage.create({ data: { id: `event-${event.id}`, campaignId: campaign.id, title: 'Moonrise Chronicle', visibility: 'Public', blocks, metadata: { preserved: 'citation metadata' } } });
  const oldEraPage = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Ember Chronicle', visibility: 'Party', workspace: 'PAGES', pathKey: 'ember-chronicle', metadata: { eraOverview: true }, blocks } });
  const nested = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'An eyewitness account', parentId: legacy.id, visibility: 'Party', workspace: 'PAGES', pathKey: 'eyewitness-account', blocks } });
  await prisma.calendarEvent.update({ where: { id: event.id }, data: { wikiPageId: legacy.id } });
  await prisma.campaignEra.update({ where: { campaignId_id: { campaignId: campaign.id, id: era } }, data: { overviewPageId: oldEraPage.id } });
  const citation = await prisma.wikiLink.create({ data: { campaignId: campaign.id, sourcePageId: oldEraPage.id, targetPageId: legacy.id } });
  await repairChronologyWikiWorkspacesForCampaign(campaign.id);
  const migrated = await prisma.wikiPage.findUniqueOrThrow({ where: { id: legacy.id } });
  const migratedEra = await prisma.wikiPage.findUniqueOrThrow({ where: { id: oldEraPage.id } });
  assert.equal(migrated.workspace, 'EVENTS'); assert.equal(migratedEra.workspace, 'ERAS');
  assert.equal(migrated.parentId, seededEvents.id, 'reuse the existing Events wiki folder');
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: seededEvents.id } })).visibility, 'Party');
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id, title: 'Events' } }), 1);
  const migratedNested = await prisma.wikiPage.findUniqueOrThrow({ where: { id: nested.id } });
  assert.equal(migratedNested.workspace, 'EVENTS'); assert.equal(migratedNested.parentId, legacy.id, 'migration preserves document hierarchy');
  assert.deepEqual(migrated.blocks, legacy.blocks); assert.deepEqual(migratedEra.blocks, oldEraPage.blocks);
  assert.equal(migrated.visibility, legacy.visibility); assert.equal(migratedEra.visibility, oldEraPage.visibility);
  assert.equal(migrated.ownerType, legacy.ownerType); assert.equal(migrated.createdByUserId, legacy.createdByUserId);
  assert.ok(await prisma.wikiLink.findUnique({ where: { id: citation.id } }));
  assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } })).wikiPageId, legacy.id);
  assert.equal((await prisma.campaignEra.findUniqueOrThrow({ where: { campaignId_id: { campaignId: campaign.id, id: era } } })).overviewPageId, oldEraPage.id);
  const pages = await prisma.wikiPage.findMany({ where: { campaignId: campaign.id } });
  assert.match(resolveCanonicalPagePath(campaign.handle, migrated, pages), /\/event-pages\/moonrise-chronicle$/);
  assert.match(resolveCanonicalPagePath(campaign.handle, migratedEra, pages), /\/era-pages\/ember-chronicle$/);
  assert.equal((await resolveWikiPageByPathKey(campaign.id, 'PAGES', 'ember-chronicle'))?.id, oldEraPage.id, 'old generic workspace bookmarks remain resolvable');
  assert.equal((await resolveWikiPageByPathKey(campaign.id, 'EVENTS', legacy.id))?.id, legacy.id, 'legacy document IDs resolve as wiki documents');
  const count = pages.length;
  await repairChronologyWikiWorkspacesForCampaign(campaign.id);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), count, 'migration does not duplicate documents');
  const unprefixedPage = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Another authored chronicle', visibility: 'Party', blocks } });
  const unprefixedEvent = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Another event', wikiPageId: unprefixedPage.id } });
  await repairChronologyWikiWorkspacesForCampaign(campaign.id);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: unprefixedPage.id } })).workspace, 'EVENTS');
  assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: unprefixedEvent.id } })).wikiPageId, unprefixedPage.id);

  let returned: any, status = 200;
  const response = { status(code: number) { status = code; return this; }, json(value: unknown) { returned = value; return this; } } as any;
  await createWikiPage({ campaign: gm, user: { id: owner.id }, body: { title: 'Mismatched account', id: `event-${event.id}`, chronologyEventId: unprefixedEvent.id }, params: {} } as any, response);
  assert.equal(status, 400);
  status = 200;
  const restricted = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Restricted', visibility: 'DM_ONLY', description: 'Private history' } });
  const manager = await buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id, discoverability: 'PRIVATE', userId: 'member-player', membershipRole: 'PARTICIPANT', allowPlayerChronologyManagement: true, partyId: null });
  await createWikiPage({ campaign: manager, user: { id: 'member-player' }, body: { title: 'Restricted account', id: `event-${restricted.id}` }, params: {} } as any, response);
  assert.equal(status, 404);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id, id: `event-${restricted.id}` } }), 0);
  status = 200;
  await getWikiPageByWorkspacePath({ campaign: player, params: { workspaceSegment: 'event-pages', pathKey: migrated.pathKey } } as any, response);
  assert.equal(status, 200); assert.equal(returned.id, legacy.id);
  await getCategoryIndex({ campaign: player, params: { pageId: migrated.parentId }, query: {} } as any, response);
  assert.ok(returned.children.some((row: any) => row.id === legacy.id), 'the existing authorized wiki browser includes migrated pages');
  const search = (ctx: typeof gm, query: string) => searchCampaign({ campaignId: campaign.id, campaignHandle: campaign.handle, actor: ctx.actor, role: ctx.role,
    isElevated: ctx === gm, query: buildSearchQueryParts(query), filters: emptyStructuredFilters(), types: null, limit: 20 });
  assert.ok((await search(player, 'Moonrise')).results.some(row => row.entityId === legacy.id && row.href.includes('/event-pages/')));
  await prisma.wikiPage.update({ where: { id: legacy.id }, data: { visibility: 'DM_Only' } });
  assert.equal((await search(player, 'Moonrise')).results.some(row => row.entityId === legacy.id), false);
  await prisma.wikiPage.update({ where: { id: legacy.id }, data: { visibility: 'Public' } });

  const newEvent = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Riverlight Discovery', visibility: 'PUBLIC' } });
  status = 200;
  await createWikiPage({ campaign: gm, user: { id: owner.id }, body: { title: 'Riverlight Chronicle', parentId: null, chronologyEventId: newEvent.id }, params: {} } as any, response);
  assert.equal(status, 201, JSON.stringify(returned));
  const newPageId = returned.page.id;
  assert.equal(returned.page.workspace, 'EVENTS'); assert.ok(returned.page.pathKey);
  const pagePath = resolveCanonicalPagePath(campaign.handle, returned.page, pages);
  await prisma.calendarEvent.update({ where: { id: newEvent.id }, data: { title: 'Renamed Riverlight' } });
  assert.equal(resolveCanonicalPagePath(campaign.handle, await prisma.wikiPage.findUniqueOrThrow({ where: { id: newPageId } }), pages), pagePath, 'renaming a chronology event does not rename or reroute its authored document');
  await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', newEvent.id, null));
  await deleteCalendarEvent({ campaign: gm, params: { calendarId: calendar.id, eventId: newEvent.id } } as any, response);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: newPageId } })).workspace, 'EVENTS');
  await deleteChronologyEra(gm, era);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: oldEraPage.id } })).workspace, 'ERAS');
  await deleteCalendarEvent({ campaign: gm, params: { calendarId: calendar.id, eventId: event.id } } as any, response);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: legacy.id } })).workspace, 'EVENTS', 'deleting a still-linked event retains its document');
  const newEraId = await saveChronologyEra(gm, { calendarId: calendar.id, name: 'Starlight Age', visibility: 'PUBLIC', startDate: null, endDate: null, isCurrent: false });
  await createWikiPage({ campaign: gm, user: { id: owner.id }, body: { title: 'Starlight Chronicle', parentId: null, chronologyEraId: newEraId }, params: {} } as any, response);
  assert.equal(status, 201, JSON.stringify(returned));
  const newEraPageId = returned.page.id;
  assert.equal(returned.page.workspace, 'ERAS');
  await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'eras', newEraId, null));
  await deleteChronologyEra(gm, newEraId);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: newEraPageId } })).workspace, 'ERAS', 'unlinked era documents retain wiki ownership');
  await repairChronologyWikiWorkspacesForCampaign(campaign.id);
  assert.ok((await search(player, 'Riverlight')).results.some(row => row.entityId === newPageId && row.href.includes('/event-pages/')));
  assert.ok((await search(player, 'Ember')).results.some(row => row.entityId === oldEraPage.id && row.href.includes('/era-pages/')));
  await createWikiPage({ campaign: gm, user: { id: owner.id }, body: { title: 'Ember Chronicle', parentId: null }, params: {} } as any, response);
  assert.equal(returned.page.workspace, 'PAGES');
  assert.notEqual(returned.page.pathKey, 'ember-chronicle', 'new generic pages cannot reclaim a migrated wiki bookmark');
  assert.equal((await resolveWikiPageByPathKey(campaign.id, 'PAGES', 'ember-chronicle'))?.id, oldEraPage.id);
});

test('startup backfill migrates pre-1.9.0 Event and Era wiki pages once', async t => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `startup-${stamp}@example.test`, passwordHash: 'test' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Riverlight', handle: `startup-${stamp}`, campaignOwnerUserId: owner.id } });
  t.after(async () => {
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  });
  const calendar = await prisma.fantasyCalendar.create({
    data: { campaignId: campaign.id, name: 'Riverlight', months: [{ name: 'Harvestmoon', length: 30, type: 'standard' }], weekdays: [], seasons: [], moons: [], leapDays: [] },
  });
  const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Moonrise', visibility: 'PUBLIC' } });
  const gm = await buildCampaignContext({
    campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id,
    discoverability: 'PRIVATE', userId: owner.id, membershipRole: 'GAMEMASTER',
    allowPlayerChronologyManagement: false, partyId: null,
  });
  const eraId = await saveChronologyEra(gm, { calendarId: calendar.id, name: 'Ember Age', visibility: 'PUBLIC', startDate: null, endDate: null, isCurrent: false });
  const blocks = [{ id: 'original-prose', type: 'text-tiptap', title: 'Account', content: { markdown: 'Unchanged chronicle.' } }];
  const eventPage = await prisma.wikiPage.create({
    data: { id: `event-${event.id}`, campaignId: campaign.id, title: 'Moonrise Chronicle', visibility: 'Public', blocks, metadata: { preserved: 'citation metadata' } },
  });
  const eraPage = await prisma.wikiPage.create({
    data: { campaignId: campaign.id, title: 'Ember Chronicle', visibility: 'Party', workspace: 'PAGES', pathKey: 'ember-chronicle', blocks },
  });
  await prisma.calendarEvent.update({ where: { id: event.id }, data: { wikiPageId: eventPage.id } });
  await prisma.campaignEra.update({ where: { campaignId_id: { campaignId: campaign.id, id: eraId } }, data: { overviewPageId: eraPage.id } });
  const citation = await prisma.wikiLink.create({ data: { campaignId: campaign.id, sourcePageId: eraPage.id, targetPageId: eventPage.id } });

  await assert.rejects(prisma.$transaction(async tx => {
    await initializeChronologyWorkspaces(tx, campaign.id);
    throw new Error('rollback');
  }), /rollback/);
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).chronologyWorkspacesInitialized, false);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: eventPage.id } })).workspace, null);

  await initializeExistingChronologyWorkspaces();
  const migrated = await prisma.wikiPage.findUniqueOrThrow({ where: { id: eventPage.id } });
  const migratedEra = await prisma.wikiPage.findUniqueOrThrow({ where: { id: eraPage.id } });
  assert.equal(migrated.workspace, 'EVENTS');
  assert.equal(migratedEra.workspace, 'ERAS');
  assert.deepEqual(migrated.blocks, blocks);
  assert.equal(migrated.visibility, 'Public');
  assert.ok(await prisma.wikiLink.findUnique({ where: { id: citation.id } }));
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).chronologyWorkspacesInitialized, true);

  await prisma.wikiPage.create({
    data: { campaignId: campaign.id, title: 'Late chronicle', visibility: 'Party', workspace: 'PAGES', pathKey: 'late-chronicle' },
  });
  await ensureChronologyWikiWorkspaces(campaign.id);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: eventPage.id } })).workspace, 'EVENTS');
  assert.equal((await prisma.wikiPage.findFirstOrThrow({ where: { campaignId: campaign.id, pathKey: 'late-chronicle' } })).workspace, 'PAGES');

  await initializeExistingChronologyWorkspaces();
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).chronologyWorkspacesInitialized, true);
});

