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
import { getEventConsequences, putEventConsequences } from '../controllers/eventConsequenceController.js';
import { saveChronologyEra, listChronologyEras } from './chronologyEraService.js';
import { mergeEventConsequenceSetIntoMetadata, type EventConsequence } from '../../../shared/eventConsequence.js';
import { updateCalendarEvent } from '../controllers/calendarEventsController.js';

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
  const context = (role: 'GAMEMASTER' | 'PARTICIPANT', manage = false) => buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id,
    discoverability: 'PRIVATE', userId: role === 'GAMEMASTER' ? owner.id : 'member-player', membershipRole: role, allowPlayerChronologyManagement: manage, partyId: null });
  const gm = await context('GAMEMASTER'), player = await context('PARTICIPANT');
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'Florence', isMasterTime: true, epochOffset: 0n,
    weekdays: [], months: [{ name: 'Harvestmoon', length: 30, type: 'standard' }], seasons: [], moons: [], leapDays: [] } });
  const first = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: "A Child's Birthday Party", description: 'A celebration for Juniper.', visibility: 'PUBLIC', targetYear: 1, targetMonth: 0, targetDay: 14 } });
  const duplicate = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: first.title } });
  const recurring = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Market Day', isRepeating: true, repeatInterval: 7, repeatUnit: 'DAYS', limitRepetitions: 3, targetYear: 1, targetMonth: 0, targetDay: 1 } });
  assert.equal(chronologySlug(first.title), 'a-childs-birthday-party');
  assert.equal(chronologySlug('Échos & Ashes'), 'échos-ashes');
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
  const authoredDocumentCount = await prisma.wikiPage.count({ where: { campaignId: campaign.id } });
  await prisma.$transaction(tx => saveEventConsequences(tx, { campaignId: campaign.id, calendarEventId: recurring.id, actorUserId: owner.id, consequences: [{ id: 'changed-harbor', kind: 'alter_location', description: 'A new market opens.', payload: {} }] }));
  assert.equal((await loadEventConsequencesForCalendarEvent(prisma, campaign.id, recurring.id)).consequences[0]?.id, 'changed-harbor');
  assert.equal((await listActionableEventConsequencesForCampaign(campaign.id, prisma))[0]?.calendarEventId, recurring.id);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), authoredDocumentCount, 'consequences do not create stub documents');
  const suggestion = await prisma.campaignWorldEventSuggestion.create({ data: { campaignId: campaign.id, kind: 'faction_pressure', title: 'Famine in the North', narrative: 'The granaries run low.', occurredAtEpochMinute: 0n, sourceRef: 'fixture', idempotencyKey: stamp } });
  const accepted = await resolveWorldDevelopmentSuggestion({ campaignId: campaign.id, campaignHandle: campaign.handle, role: 'GAMEMASTER', userId: owner.id, suggestionId: suggestion.id, action: 'accept' });
  assert.ok(accepted.calendarEventId);
  assert.equal(accepted.lorePageId, undefined);
  assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: accepted.calendarEventId } })).wikiPageId, null);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), authoredDocumentCount, 'generated events do not create stub documents');
  const backup = await buildOperationalPayload(campaign.id);
  await prisma.chronologyRoute.deleteMany({ where: { campaignId: campaign.id } });
  await restoreOperationalPayload(campaign.id, backup);
  assert.ok((await chronologyRouteMap(campaign.id, 'events')).get(first.id)?.slugAliases.includes('a-childs-birthday-party'));

  await t.test('the event update API reserves the new title and old alias atomically', async () => {
    const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Before the Discovery', visibility: 'PUBLIC' } });
    let returned: any;
    await updateCalendarEvent({ campaign: gm, params: { calendarId: calendar.id, eventId: event.id }, body: { title: 'After the Discovery' } } as any,
      { status(code: number) { assert.equal(code, 200); return this; }, json(value: unknown) { returned = value; } } as any);
    assert.equal(returned.event.title, 'After the Discovery');
    // Inspect the transaction result before any read-side slug backfill can repair it.
    const rows = await prisma.chronologyRoute.findMany({ where: { campaignId: campaign.id, entityType: 'events', entityId: event.id } });
    assert.equal(rows.find(row => row.slug === 'before-the-discovery')?.canonical, false);
    assert.equal(rows.find(row => row.slug === 'after-the-discovery')?.canonical, true);
  });

  await t.test('the optional page relation cascades page ID changes and clears links on hard deletion', async () => {
    const document = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'An independent account', visibility: 'Party' } });
    const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Linked to an account', wikiPageId: document.id }, include: { wikiPage: true } });
    assert.equal(event.wikiPage?.id, document.id);
    assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: document.id }, include: { calendarEvents: true } })).calendarEvents[0]?.id, event.id);
    const changedId = randomUUID();
    await prisma.wikiPage.update({ where: { id: document.id }, data: { id: changedId } });
    assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } })).wikiPageId, changedId);
    await prisma.wikiPage.delete({ where: { id: changedId } });
    assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } })).wikiPageId, null);
  });

  await t.test('restoring a canonical route demotes other current routes without removing aliases', async () => {
    const restored = backup.chronologyRoutes!.find(row => row.entityId === first.id && row.canonical)!;
    await prisma.chronologyRoute.updateMany({ where: { campaignId: campaign.id, entityType: 'events', entityId: first.id }, data: { canonical: false } });
    await prisma.chronologyRoute.create({ data: { campaignId: campaign.id, entityType: 'events', entityId: first.id, title: String(restored.title), slug: 'newer-live-bookmark', canonical: true } });
    const restore = (row: Record<string, unknown>) => restoreOperationalPayload(campaign.id, { chronologyRoutes: [row], downtimeHavens: [], downtimeProjects: [], pluginData: [] });
    await restore(restored);
    assert.deepEqual((await prisma.chronologyRoute.findMany({ where: { campaignId: campaign.id, entityType: 'events', entityId: first.id, canonical: true } })).map(row => row.slug), [restored.slug]);
    assert.equal((await prisma.chronologyRoute.findUniqueOrThrow({ where: { campaignId_entityType_slug: { campaignId: campaign.id, entityType: 'events', slug: 'newer-live-bookmark' } } })).canonical, false);
    await restore({ ...restored, slug: 'restored-historical-alias', canonical: false });
    assert.deepEqual((await prisma.chronologyRoute.findMany({ where: { campaignId: campaign.id, entityType: 'events', entityId: first.id, canonical: true } })).map(row => row.slug), [restored.slug]);
  });

  await t.test('slug normalization preserves marks and unifies canonically equivalent titles', () => {
    assert.equal(chronologySlug('कथा और खोज'), 'कथा-और-खोज');
    assert.equal(chronologySlug('حِكايةُ آش'), 'حِكايةُ-آش');
    assert.equal(chronologySlug('A criança d’Água'), 'a-criança-dágua');
    assert.equal(chronologySlug('E\u0301chos & Ashes'), chronologySlug('Échos & Ashes'));
    assert.equal(chronologySlug('Échos & Ashes').normalize('NFC'), chronologySlug('Échos & Ashes'));
  });

  await t.test('only an explicit description edit changes authored era text', async () => {
    const input = { calendarId: calendar.id, name: 'A Shared Age', startDate: null, endDate: null, isCurrent: false, visibility: 'PUBLIC' as const };
    const id = await saveChronologyEra(gm, { ...input, description: 'Authored chronology description.' });
    await saveChronologyEra(gm, { ...input, name: 'Renamed Shared Age', overview: 'A stale page projection.' } as typeof input, undefined, id);
    const stored = () => prisma.campaignEra.findUniqueOrThrow({ where: { campaignId_id: { campaignId: campaign.id, id } } });
    assert.equal((await stored()).description, 'Authored chronology description.');
    const document = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Restricted age account', visibility: 'DM_Only', blocks: [{ type: 'text-tiptap', content: { markdown: 'Restricted wiki prose.' } }] } });
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'eras', id, document.id));
    await saveChronologyEra(gm, { ...input, description: null }, undefined, id);
    const projected = (await listChronologyEras(gm)).find(era => era.id === id)!;
    assert.equal(projected.overview, 'Restricted wiki prose.');
    await saveChronologyEra(gm, { ...input, overview: projected.overview } as typeof input, undefined, id);
    assert.equal((await stored()).description, null, 'saving a page-derived overview must not author chronology prose');
    assert.equal((await listChronologyEras(player)).find(era => era.id === id)?.overview, '');
    await saveChronologyEra(gm, { ...input, description: 'Explicit new description.' }, undefined, id);
    assert.equal((await stored()).description, 'Explicit new description.');
    await saveChronologyEra(gm, { ...input, description: '  Trimmed description.  ' }, undefined, id);
    assert.equal((await stored()).description, 'Trimmed description.');
    await saveChronologyEra(gm, { ...input, description: ' \n ' }, undefined, id);
    assert.equal((await stored()).description, null);
  });

  await t.test('chronology managers need page edit authority to link or move authored documents', async () => {
    const manager = await context('PARTICIPANT', true);
    const document = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Staff account', visibility: 'Public', ownerType: 'STAFF' } });
    const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Staff history', visibility: 'PUBLIC' } });
    await assert.rejects(prisma.$transaction(tx => linkChronologyPage(tx, manager, 'events', event.id, document.id, true)), /Forbidden: cannot edit/);
    assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: document.id } })).workspace, null);
    await prisma.$transaction(tx => linkChronologyPage(tx, gm, 'events', event.id, document.id));
    await assert.rejects(prisma.$transaction(tx => linkChronologyPage(tx, manager, 'events', event.id, null)), /Forbidden: cannot edit/);
    assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } })).wikiPageId, document.id);
  });

  await t.test('PUT consequences returns the same authorized linked-page state as GET', async () => {
    const contributor = await context('PARTICIPANT', true);
    const document = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Shared consequence account', visibility: 'Party' } });
    const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Shared consequences', visibility: 'PARTY', wikiPageId: document.id } });
    let returned: any;
    const res = { status(code: number) { assert.equal(code, 200); return this; }, json(value: unknown) { returned = value; } } as any;
    const req = { campaign: contributor, params: { eventId: event.id }, user: { id: 'member-player' }, body: { consequences: [] } } as any;
    await putEventConsequences(req, res);
    assert.equal(returned.lorePageId, document.id);
    const put = returned;
    await getEventConsequences(req, res);
    assert.deepEqual(returned, put);
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'DM_Only' } });
    await putEventConsequences(req, res);
    assert.equal(returned.lorePageId, null, 'PUT does not disclose a page that became restricted');
    await prisma.wikiPage.update({ where: { id: document.id }, data: { visibility: 'Party', deletedAt: new Date() } });
    await putEventConsequences(req, res);
    assert.equal(returned.lorePageId, null);
    await prisma.calendarEvent.update({ where: { id: event.id }, data: { wikiPageId: null } });
    await putEventConsequences(req, res);
    assert.equal(returned.lorePageId, null);
  });

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
    assert.deepEqual(((await prisma.wikiPage.findUniqueOrThrow({ where: { id: document.id } })).metadata as Record<string, unknown>).eventConsequences, (document.metadata as Record<string, unknown>).eventConsequences, 'operational saves do not mutate authored consequences');

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
