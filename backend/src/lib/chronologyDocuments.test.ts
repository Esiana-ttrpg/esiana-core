import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { resolveWorldDevelopmentSuggestion } from './worldDevelopmentResolveService.js';
import { prisma } from './prisma.js';
import { chronologyRouteMap, chronologySlug, reserveChronologyRoute } from './chronologyRoutes.js';
import { buildCampaignContext } from './campaignScopeContext.js';
import { linkChronologyPage } from '../controllers/chronologyPagesController.js';
import { getChronologyTimelineBundle } from '../controllers/chronologyController.js';
import { loadEventConsequencesForCalendarEvent, saveEventConsequences, listActionableEventConsequencesForCampaign } from './eventConsequenceStore.js';
import { buildOperationalPayload, restoreOperationalPayload } from './campaignExport/sovereignOperational.js';
import { getEventConsequences } from '../controllers/eventConsequenceController.js';
import { saveChronologyEra, listChronologyEras } from './chronologyEraService.js';
import { mergeEventConsequenceSetIntoMetadata, type EventConsequence } from '../../../shared/eventConsequence.js';

if (process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL) {
  process.env.DATABASE_PROVIDER = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL.startsWith('file:') ? 'sqlite' : 'postgresql';
  process.env.DATABASE_URL = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
}

test('chronology URLs and optional documents preserve identity, isolation and permissions', async t => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `documents-${stamp}@example.test`, passwordHash: 'test' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Florence', handle: `documents-${stamp}`, campaignOwnerUserId: owner.id } });
  const other = await prisma.campaign.create({ data: { name: 'Elsewhere', handle: `other-${stamp}`, campaignOwnerUserId: owner.id } });
  t.after(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: [campaign.id, other.id] } } });
    await prisma.user.delete({ where: { id: owner.id } }); await prisma.$disconnect();
  });
  const context = (role: 'GAMEMASTER' | 'PARTICIPANT') => buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id,
    discoverability: 'PRIVATE', userId: role === 'GAMEMASTER' ? owner.id : 'member-player', membershipRole: role, allowPlayerChronologyManagement: false, partyId: null });
  const gm = await context('GAMEMASTER'), player = await context('PARTICIPANT');
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'Florence', isMasterTime: true, epochOffset: 0n,
    weekdays: [], months: [{ name: 'Harvestmoon', length: 30, type: 'standard' }], seasons: [], moons: [], leapDays: [] } });
  const first = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: "A Child's Birthday Party", description: 'A celebration for Juniper.', visibility: 'PUBLIC', targetYear: 1, targetMonth: 0, targetDay: 14 } });
  const duplicate = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: first.title } });
  const recurring = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Market Day', isRepeating: true, repeatInterval: 7, repeatUnit: 'DAYS', limitRepetitions: 3, targetYear: 1, targetMonth: 0, targetDay: 1 } });
  assert.equal(chronologySlug(first.title), 'a-childs-birthday-party');
  assert.equal(chronologySlug('Échos & Ashes'), 'echos-ashes');
  let routes = await chronologyRouteMap(campaign.id, 'events');
  assert.equal(routes.get(first.id)?.slug, 'a-childs-birthday-party');
  assert.equal(routes.get(duplicate.id)?.slug, 'a-childs-birthday-party-2');
  await prisma.$transaction(async tx => {
    await tx.campaign.update({ where: { id: campaign.id }, data: { updatedAt: new Date() } });
    await tx.calendarEvent.update({ where: { id: first.id }, data: { title: 'Juniper’s Celebration' } });
    await reserveChronologyRoute(tx, campaign.id, 'events', first.id, 'Juniper’s Celebration');
    await reserveChronologyRoute(tx, campaign.id, 'eras', 'independent-era', first.title);
    await reserveChronologyRoute(tx, other.id, 'events', 'independent-event', first.title);
  });
  routes = await chronologyRouteMap(campaign.id, 'events');
  assert.equal(routes.get(first.id)?.slug, 'junipers-celebration');
  assert.ok(routes.get(first.id)?.slugAliases.includes('a-childs-birthday-party'));
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), 0);
  const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'The Celebration', visibility: 'DM_Only', blocks: [{ type: 'text-tiptap', content: { markdown: 'An independent article.' } }] } });
  const foreignPage = await prisma.wikiPage.create({ data: { campaignId: other.id, title: 'Another campaign', visibility: 'Party' } });
  await assert.rejects(prisma.$transaction(tx => linkChronologyPage(tx, player, 'events', first.id, page.id)), /not permitted/);
  await assert.rejects(prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', first.id, foreignPage.id)), /Page not found/);
  await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', first.id, page.id));
  let bundle: any;
  const request = { campaign: player, query: {} } as any;
  await getChronologyTimelineBundle(request, { json(value: unknown) { bundle = value; } } as any);
  assert.equal(bundle.baseEvents.find((row: any) => row.id === first.id).wikiPageId, null, 'hidden page links are not disclosed');
  assert.equal(bundle.occurrences.filter((row: any) => row.baseEventId === recurring.id && row.isStart).length, 3);
  assert.equal(bundle.baseEvents.filter((row: any) => row.id === recurring.id).length, 1);
  await prisma.wikiPage.update({ where: { id: page.id }, data: { deletedAt: new Date() } });
  await getChronologyTimelineBundle({ campaign: gm, query: {} } as any, { json(value: unknown) { bundle = value; } } as any);
  assert.equal(bundle.baseEvents.find((row: any) => row.id === first.id).wikiPageId, null);
  await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', first.id, null));
  assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: first.id } })).description, first.description);
  await prisma.$transaction(tx => saveEventConsequences(tx, { campaignId: campaign.id, calendarEventId: recurring.id, actorUserId: owner.id, consequences: [{ id: 'changed-harbor', kind: 'alter_location', description: 'A new market opens.', payload: {} }] }));
  assert.equal((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, recurring.id)).consequences[0]?.id, 'changed-harbor');
  assert.equal((await listActionableEventConsequencesForCampaign(campaign.id, prisma))[0]?.calendarEventId, recurring.id);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), 1, 'consequences do not create stub documents');
  const suggestion = await prisma.campaignWorldEventSuggestion.create({ data: { campaignId: campaign.id, kind: 'faction_pressure', title: 'Famine in the North', narrative: 'The granaries run low.', occurredAtEpochMinute: 0n, sourceRef: 'fixture', idempotencyKey: stamp } });
  const accepted = await resolveWorldDevelopmentSuggestion({ campaignId: campaign.id, campaignHandle: campaign.handle, role: 'GAMEMASTER', userId: owner.id, suggestionId: suggestion.id, action: 'accept' });
  assert.ok(accepted.calendarEventId);
  assert.equal(accepted.lorePageId, undefined);
  assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: accepted.calendarEventId } })).wikiPageId, null);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), 1, 'generated events do not create stub documents');
  const backup = await buildOperationalPayload(campaign.id);
  await prisma.chronologyRoute.deleteMany({ where: { campaignId: campaign.id } });
  await restoreOperationalPayload(campaign.id, backup);
  assert.ok((await chronologyRouteMap(campaign.id, 'events')).get(first.id)?.slugAliases.includes('a-childs-birthday-party'));

  await t.test('historical aliases and deleted reservations cannot be reclaimed', async () => {
    const third = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: first.title } });
    assert.equal((await chronologyRouteMap(campaign.id, 'events')).get(third.id)?.slug, 'a-childs-birthday-party-3');
    await prisma.calendarEvent.delete({ where: { id: duplicate.id } });
    const fourth = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: first.title } });
    assert.equal((await chronologyRouteMap(campaign.id, 'events')).get(fourth.id)?.slug, 'a-childs-birthday-party-4');
    await prisma.calendarEvent.delete({ where: { id: first.id } });
    const renamed = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Juniper’s Celebration' } });
    assert.equal((await chronologyRouteMap(campaign.id, 'events')).get(renamed.id)?.slug, 'junipers-celebration-2');
    assert.equal((await prisma.chronologyRoute.findUniqueOrThrow({ where: { campaignId_entityType_slug: { campaignId: campaign.id, entityType: 'events', slug: 'a-childs-birthday-party' } } })).entityId, first.id);
  });

  await t.test('subsequent page and record visibility changes are checked independently', async () => {
    const document = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'A restricted account', visibility: 'Public', blocks: [{ id: 'description', type: 'text-tiptap', content: { markdown: 'Private authored text.' }, isPrivate: true }] } });
    const eraId = await saveChronologyEra(gm, { calendarId: calendar.id, name: 'Age of Ashes', startDate: null, endDate: null, isCurrent: false, visibility: 'PUBLIC' });
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'eras', eraId, document.id));
    const eraFor = async (ctx: typeof player) => (await listChronologyEras(ctx)).find(era => era.id === eraId);
    assert.equal((await eraFor(player))?.overview, '', 'public pages do not expose private blocks');
    assert.equal((await eraFor(gm))?.overview, 'Private authored text.');
    await prisma.wikiPage.update({ where: { id: document.id }, data: { blocks: [{ id: 'description', type: 'text-tiptap', content: { markdown: 'Visible authored text.' } }] } });
    assert.equal((await eraFor(player))?.overview, 'Visible authored text.');
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'DM_Only' } });
    assert.equal((await eraFor(player))?.overviewPageId, null);
    assert.equal((await eraFor(player))?.overview, '');
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'Public' } });
    const presence = await prisma.contentPresenceState.create({ data: { campaignId: campaign.id, entityType: 'wiki_page', entityId: document.id, state: 'HIDDEN' } });
    assert.equal((await eraFor(player))?.overviewPageId, null, 'discovery restrictions still apply');
    await prisma.contentPresenceState.delete({ where: { id: presence.id } });
    await prisma.campaignEra.update({ where: { campaignId_id: { campaignId: campaign.id, id: eraId } }, data: { visibility: 'DM_ONLY' } });
    assert.equal(await eraFor(player), undefined, 'public page access does not disclose a restricted era');

    const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Linked discovery', visibility: 'PUBLIC', wikiPageId: document.id } });
    const response = { json(value: unknown) { bundle = value; } } as any;
    await getChronologyTimelineBundle(request, response);
    assert.equal(bundle.baseEvents.find((row: any) => row.id === event.id)?.wikiPageId, document.id);
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'DM_Only' } });
    await getChronologyTimelineBundle(request, response);
    assert.equal(bundle.baseEvents.find((row: any) => row.id === event.id)?.wikiPageId, null);
    await prisma.calendarEvent.update({ where: { id: event.id }, data: { visibility: 'DM_ONLY' } });
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'Public' } });
    await getChronologyTimelineBundle(request, response);
    assert.equal(bundle.baseEvents.find((row: any) => row.id === event.id), undefined);
  });

  await t.test('event consequences win over stale documents, including an explicit empty set', async () => {
    const old: EventConsequence[] = [{ id: 'old', kind: 'alter_location', description: 'Old page copy', payload: {} }];
    const latest: EventConsequence[] = [{ id: 'latest', kind: 'alter_location', description: 'Latest event state', payload: {} }];
    const document = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Old account', visibility: 'Party', metadata: mergeEventConsequenceSetIntoMetadata({}, old) as never } });
    const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Operational event', visibility: 'PUBLIC', wikiPageId: document.id, metadata: { retained: 'newer event metadata' } } });
    const save = (consequences: EventConsequence[]) => prisma.$transaction(tx => saveEventConsequences(tx, { campaignId: campaign.id, calendarEventId: event.id, actorUserId: owner.id, consequences }));
    await save(latest);
    assert.deepEqual((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, event.id)).consequences.map(row => row.id), ['latest']);
    assert.deepEqual((await listActionableEventConsequencesForCampaign(campaign.id, prisma)).find(row => row.calendarEventId === event.id)?.consequences.map(row => row.id), ['latest']);
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', event.id, null));
    assert.deepEqual((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, event.id)).consequences.map(row => row.id), ['latest']);
    assert.equal(((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } })).metadata as Record<string, unknown>).retained, 'newer event metadata');
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', event.id, document.id));
    await save([]);
    assert.deepEqual((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, event.id)).consequences, [], 'an empty event set suppresses stale page consequences while linked');
    assert.equal((await listActionableEventConsequencesForCampaign(campaign.id, prisma)).find(row => row.calendarEventId === event.id), undefined);
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', event.id, null));
    assert.deepEqual((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, event.id)).consequences, []);
    assert.deepEqual((await prisma.wikiPage.findUniqueOrThrow({ where: { id: document.id } })).metadata, document.metadata, 'operational saves do not mutate authored metadata');

    const legacy = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Legacy event', visibility: 'PUBLIC', wikiPageId: document.id } });
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'DM_Only' } });
    let returned: any;
    await getEventConsequences({ campaign: player, params: { eventId: legacy.id } } as any, { json(value: unknown) { returned = value; } } as any);
    assert.deepEqual(returned.consequences, [], 'restricted page metadata is not returned via a public event');
    assert.equal(returned.lorePageId, null);
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'Party' } });
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', legacy.id, null));
    assert.deepEqual((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, legacy.id)).consequences.map(row => row.id), ['old'], 'legacy-only data survives an authorized unlink');
  });
});
