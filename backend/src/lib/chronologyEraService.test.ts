import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { buildCampaignContext } from './campaignScopeContext.js';
import { ensureChronologyEras, listChronologyEras, saveChronologyEra, deleteChronologyEra, chronologyEraImpact, reorderChronologyEras, eraDateToMinute } from './chronologyEraService.js';
import { nextEraOccurrence } from './eraRecurrence.js';
import { eraOccurrenceSchedule, type EraHistory } from './eraOccurrenceHistory.js';
import { parseCampaignMomentumState, getCurrentCampaignEra, normalizeEraTrajectories } from '../../../shared/factionMomentumMetadata.js';
import type { EraInput } from '../../../shared/chronologyEras.js';
import { eraContainsDate } from '../../../shared/chronologyEras.js';
import { redactEraReferences } from './eraDisclosure.js';
import { convertEpochToCalendarState } from './timeEngine.js';
import { buildOperationalPayload, restoreOperationalPayload } from './campaignExport/sovereignOperational.js';
import { deleteFantasyCalendar } from '../controllers/fantasyCalendarController.js';

// env.ts intentionally reloads development config; restore the isolated fixture selection.
if (process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL) {
  process.env.DATABASE_PROVIDER = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL.startsWith('file:') ? 'sqlite' : 'postgresql';
  process.env.DATABASE_URL = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
}

test('chronology eras: migration, authorization, dates, order, visibility and non-destructive deletion', async t => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `era-${stamp}@example.test`, passwordHash: 'test' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Eras test', handle: `eras-${stamp}`, campaignOwnerUserId: owner.id } });
  t.after(async () => {
    await prisma.campaignEra.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.user.delete({ where: { id: owner.id } });
    await prisma.$disconnect();
  });
  const calendar = await prisma.fantasyCalendar.create({ data: {
    campaignId: campaign.id, name: 'World History', isMasterTime: true, epochOffset: 1440n,
    weekdays: [{ name: 'Dawn', length: 1 }], months: [{ name: 'Deepwinter', length: 30, type: 'standard' }],
    seasons: [], moons: [], leapDays: [],
  } });
  await prisma.campaignMomentum.create({ data: { campaignId: campaign.id, state: { eras: [{ id: 'legacy', name: 'Unnumbered Age', sortOrder: 0, isCurrent: true, narrativeNote: 'The first dawn.' }] } } });
  const context = (role: 'GAMEMASTER' | 'WRITER' | 'PARTICIPANT' | 'OBSERVER', allowed = false) => buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id,
    discoverability: 'PRIVATE', userId: role === 'GAMEMASTER' ? owner.id : `member-${role}`, membershipRole: role, allowPlayerChronologyManagement: allowed, chronologyContributor: false, partyId: null });
  const gm = await context('GAMEMASTER');
  const player = await context('PARTICIPANT', true);
  await ensureChronologyEras(campaign.id);
  await ensureChronologyEras(campaign.id);
  const migrated = await listChronologyEras(gm);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].id, 'legacy');
  assert.equal(migrated[0].overview, 'The first dawn.');
  const input: EraInput = { calendarId: calendar.id, name: 'Age of Embers', startDate: { year: 2, month: 0, day: 1 }, endDate: { year: 2, month: 0, day: 30 }, isCurrent: true, visibility: 'DM_ONLY', overview: 'A substantial **Overview**.' };
  for (const ctx of [await context('OBSERVER', true), await context('PARTICIPANT')]) {
    await assert.rejects(saveChronologyEra(ctx, { ...input, visibility: 'PARTY' }), /not permitted/);
    await assert.rejects(saveChronologyEra(ctx, { ...input, visibility: 'PARTY' }, undefined, 'legacy'), /not permitted/);
    await assert.rejects(reorderChronologyEras(ctx, calendar.id, ['legacy']), /not permitted/);
    await assert.rejects(deleteChronologyEra(ctx, 'legacy'), /not permitted/);
    await assert.rejects(chronologyEraImpact(ctx, 'legacy'), /not permitted/);
  }
  await assert.rejects(saveChronologyEra(player, input), /elevated narrative/);
  const id = await saveChronologyEra(gm, input, owner.id);
  let eras = await listChronologyEras(gm);
  const created = eras.find(era => era.id === id)!;
  assert.deepEqual(created.endDate, input.endDate);
  assert.equal(created.status, 'FUTURE');
  assert.equal(created.isCurrent, true);
  assert.equal(JSON.stringify(created).includes('epoch'), false);
  assert.equal((await listChronologyEras(player)).some(era => era.id === id), false);
  await assert.rejects(saveChronologyEra(player, { ...input, visibility: 'PARTY' }, undefined, id), /not found/);
  await assert.rejects(deleteChronologyEra(player, id), /not found/);
  await assert.rejects(chronologyEraImpact(player, id), /not found/);
  const playerEra = await saveChronologyEra(player, { ...input, name: 'A shared discovery', isCurrent: false, visibility: 'PARTY' });
  await saveChronologyEra(player, { ...input, name: 'A shared discovery revised', isCurrent: false, visibility: 'PARTY' }, undefined, playerEra);
  await deleteChronologyEra(player, playerEra);
  assert.throws(() => eraDateToMinute(calendar, { year: 1, month: 0, day: 31 }), /Deepwinter has 30 days/);
  const leapCalendar = { ...calendar, leapDays: [{ everyYears: 2, afterMonthIndex: 0, month: { name: 'Veilnight', length: 1, type: 'intercalary' } }] };
  const leapMinute = eraDateToMinute(leapCalendar, { year: 2, month: 1, day: 1 })!;
  const roundTrip = convertEpochToCalendarState(leapMinute, leapCalendar);
  assert.deepEqual([roundTrip.year, roundTrip.monthIndex, roundTrip.day], [2, 1, 1]);
  assert.throws(() => eraDateToMinute(leapCalendar, { year: 1, month: 1, day: 1 }), /Choose a month/);
  const second = await saveChronologyEra(await context('WRITER'), { ...input, name: 'Earlier date, later sequence', startDate: { year: 1, month: 0, day: 1 }, endDate: null, visibility: 'PARTY', isCurrent: false });
  await assert.rejects(saveChronologyEra(gm, { ...input, name: '   ' }), /era name/);
  await assert.rejects(saveChronologyEra(gm, { ...input, calendarId: 'another-campaign-calendar' }), /timeline in this campaign/);
  await assert.rejects(reorderChronologyEras(player, calendar.id, [id, 'legacy', second]), /Reload/);
  const otherTrack = await prisma.fantasyCalendar.create({ data: {
    campaignId: campaign.id, name: 'Other history', weekdays: [], months: calendar.months!, seasons: [], moons: [], leapDays: [],
  } });
  const otherEra = await saveChronologyEra(gm, { ...input, calendarId: otherTrack.id, name: 'Other track current', visibility: 'PARTY' });
  const otherOverview = (await listChronologyEras(gm)).find(era => era.id === otherEra)!.overviewPageId;
  await reorderChronologyEras(gm, calendar.id, [id, 'legacy', second]);
  eras = await listChronologyEras(gm);
  assert.deepEqual(eras.filter(era => era.calendarId === calendar.id).map(era => era.id), [id, 'legacy', second]);
  assert.equal(eras.find(era => era.id === otherEra)?.isCurrent, true);
  const backup = await buildOperationalPayload(campaign.id);
  assert.equal(backup.campaignEras?.length, 4);
  await restoreOperationalPayload(campaign.id, backup);
  assert.deepEqual((await listChronologyEras(gm)).filter(era => era.calendarId === calendar.id).map(era => era.id), [id, 'legacy', second]);
  await prisma.campaign.update({ where: { id: campaign.id }, data: { currentEpochMinute: 1000000n } });
  const past = (await listChronologyEras(gm)).find(era => era.id === id)!;
  assert.equal(past.status, 'PAST'); assert.equal(past.isCurrent, true); assert.equal(past.visibility, 'DM_ONLY');
  const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Public event in a private era', visibility: 'PUBLIC', targetYear: 2, targetMonth: 0, targetDay: 5 } });
  const repeat = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Repeated discovery', visibility: 'DM_ONLY', targetYear: 2, targetMonth: 0, targetDay: 5, isRepeating: true, repeatUnit: 'ERAS', repeatInterval: 1, limitRepetitions: 8 } });
  const before = eraOccurrenceSchedule(repeat, calendar, 1000000n, await prisma.campaignEra.findMany({ where: { campaignId: campaign.id } }), undefined);
  await saveChronologyEra(gm, { ...input, startDate: { year: 3, month: 0, day: 1 }, endDate: null }, undefined, id);
  const history = (await prisma.campaignMomentum.findUniqueOrThrow({ where: { campaignId: campaign.id } })).eraRecurrenceHistory as EraHistory;
  const afterEdit = eraOccurrenceSchedule(repeat, calendar, 1000000n, await prisma.campaignEra.findMany({ where: { campaignId: campaign.id } }), history[repeat.id]);
  assert.deepEqual(afterEdit, before, 'editing ranges must not move historical occurrences');
  await saveChronologyEra(gm, input, undefined, id);
  const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'A planned future', visibility: 'Party', metadata: { character: { eraTrajectories: [{ eraId: id, byEraId: id, direction: 'Renewing', outcome: 'The harbor returns', gmNote: 'Preserve this' }] } } } });
  const impact = await chronologyEraImpact(gm, id);
  await prisma.wikiLink.create({ data: { campaignId: campaign.id, sourcePageId: page.id, targetPageId: created.overviewPageId } });
  assert.equal(impact.events, 2); assert.equal(impact.trajectories, 1); assert.ok(impact.overviewWords > 0);
  await deleteChronologyEra(gm, id);
  const afterDelete = eraOccurrenceSchedule(repeat, calendar, 1000000n, await prisma.campaignEra.findMany({ where: { campaignId: campaign.id } }), ((await prisma.campaignMomentum.findUniqueOrThrow({ where: { campaignId: campaign.id } })).eraRecurrenceHistory as EraHistory)[repeat.id]);
  assert.deepEqual(afterDelete, before, 'deletion must preserve historical ordinals and dates');
  assert.equal(await prisma.wikiPage.findUnique({ where: { id: created.overviewPageId } }), null);
  assert.ok(await prisma.calendarEvent.findUnique({ where: { id: event.id } }));
  const metadata = (await prisma.wikiPage.findUniqueOrThrow({ where: { id: page.id } })).metadata as any;
  const detached = normalizeEraTrajectories(metadata.character.eraTrajectories);
  assert.equal(detached.length, 1); assert.equal(detached[0].eraId, null); assert.equal(detached[0].eraSnapshot?.name, input.name);
  assert.equal(detached[0].outcome, 'The harbor returns');
  const state = parseCampaignMomentumState((await prisma.campaignMomentum.findUniqueOrThrow({ where: { campaignId: campaign.id } })).state);
  assert.equal(getCurrentCampaignEra(state).id, '');
  assert.equal((await listChronologyEras(gm)).filter(era => era.calendarId === calendar.id).some(era => era.isCurrent), false);
  assert.deepEqual((await listChronologyEras(gm)).filter(era => era.calendarId === calendar.id).map(era => era.sortOrder), [0, 1]);
  let calendarDeleteBody: unknown;
  await deleteFantasyCalendar({ campaign: gm, params: { calendarId: otherTrack.id } } as any, {
    status(code: number) { assert.equal(code, 200); return this; },
    json(body: unknown) { calendarDeleteBody = body; return this; },
  } as any);
  assert.deepEqual(calendarDeleteBody, { ok: true });
  assert.equal(await prisma.campaignEra.findUnique({ where: { campaignId_id: { campaignId: campaign.id, id: otherEra } } }), null);
  assert.equal(await prisma.wikiPage.findUnique({ where: { id: otherOverview } }), null);
  assert.equal(await prisma.fantasyCalendar.findUnique({ where: { id: otherTrack.id } }), null);
});

test('era recurrence follows manual sequence, including private eras and midnight starts', () => {
  const eras = [
    { calendarId: 'a', sortOrder: 0, epochStartMinute: 1440n, epochEndMinute: 2880n },
    { calendarId: 'a', sortOrder: 1, epochStartMinute: 0n, epochEndMinute: 1440n },
    { calendarId: 'b', sortOrder: 2, epochStartMinute: 9999n, epochEndMinute: null },
  ];
  assert.equal(nextEraOccurrence(eras, 'a', 1440n, 1, 1), 0n);
  assert.equal(nextEraOccurrence(eras.slice(0, 1), 'a', 1440n, 1, 1), null);
});

test('inclusive public date ranges allow overlaps, gaps and open bounds', () => {
  const date = { year: 2, month: 0, day: 5 };
  assert.equal(eraContainsDate({ startDate: date, endDate: date }, date), true);
  assert.equal(eraContainsDate({ startDate: null, endDate: null }, date), true);
  assert.equal(eraContainsDate({ startDate: { ...date, day: 6 }, endDate: null }, date), false);
  assert.equal(eraContainsDate({ startDate: null, endDate: { ...date, day: 4 } }, date), false);
});

test('historical recurrence retains ordinal identity while future dates can change', () => {
  const event = { id: 'repeat', calendarId: 'track', targetYear: 1, targetMonth: 0, targetDay: 1, targetEpochMinute: 0n, repeatInterval: 1, limitRepetitions: 5 };
  const calendar = { id: 'track', epochOffset: 0n, months: [{ name: 'Deepwinter', length: 30 }], weekdays: [], seasons: [], moons: [], leapDays: [] };
  const eras = [0n, 100n, 1000n, 50n, 2000n].map((minute, sortOrder) => ({ calendarId: 'track', sortOrder, epochStartMinute: minute, epochEndMinute: minute + 1n })) as Parameters<typeof eraOccurrenceSchedule>[3];
  const history = { through: '100', starts: { '0': '0', '1': '100', '3': '50' } };
  const changed = eras.map(era => ({ ...era, epochStartMinute: era.sortOrder === 2 ? 1500n : era.sortOrder === 1 ? 3000n : era.epochStartMinute }));
  assert.deepEqual(eraOccurrenceSchedule(event, calendar, 100n, changed, history), [0n, 100n, 1500n, 50n, 2000n]);
  assert.deepEqual(eraOccurrenceSchedule(event, calendar, 100n, [], history), [0n, 100n, null, 50n, null]);
  // An edited future slot cannot be backdated into newly invented campaign history.
  changed[2] = { ...changed[2], epochStartMinute: 75n };
  assert.equal(eraOccurrenceSchedule(event, calendar, 100n, changed, history)[2], null);
});

test('hidden era associations and deleted private names are not disclosed', () => {
  const hidden = new Set(['private']);
  const result = redactEraReferences({ eraTrajectories: [
    { eraId: 'private', direction: 'Hidden plan' },
    { eraId: 'public', byEraId: 'private' },
    { eraId: null, eraSnapshot: { name: 'Secret age', visibility: 'DM_ONLY' } },
  ] }, hidden);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('Secret age'), false);
  assert.equal(JSON.stringify(result).includes('Hidden plan'), false);
});
