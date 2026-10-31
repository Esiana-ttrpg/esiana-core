import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from './prisma.js';
import { initializeEventCategories } from './defaultEventCategories.js';
import { DEFAULT_EVENT_CATEGORIES } from '../../../shared/defaultEventCategories.js';
import { createCalendarEventCategory, updateCalendarEventCategory, deleteCalendarEventCategory, listCalendarEventCategories } from '../controllers/calendarEventCategoriesController.js';
import { resolveWorldDevelopmentSuggestion } from './worldDevelopmentResolveService.js';

test('defaults initialize once, preserve authored data, and support campaign category management', async t => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `${stamp}@example.test`, passwordHash: 'test' } });
  const campaigns: string[] = [];
  t.after(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: campaigns } } });
    await prisma.user.delete({ where: { id: owner.id } });
    await prisma.$disconnect();
  });
  async function campaign() {
    const row = await prisma.campaign.create({ data: { name: 'River archive', handle: randomUUID(), campaignOwnerUserId: owner.id } });
    campaigns.push(row.id); return row;
  }
  const fresh = await campaign();
  await assert.rejects(prisma.$transaction(async tx => {
    await initializeEventCategories(tx, fresh.id);
    throw new Error('rollback');
  }), /rollback/);
  assert.equal(await prisma.calendarEventCategory.count({ where: { campaignId: fresh.id } }), 0);
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: fresh.id } })).eventCategoriesInitialized, false);
  await prisma.$transaction(tx => initializeEventCategories(tx, fresh.id));
  await prisma.$transaction(tx => initializeEventCategories(tx, fresh.id));
  const defaults = await prisma.calendarEventCategory.findMany({ where: { campaignId: fresh.id }, orderBy: { sortOrder: 'asc' } });
  assert.deepEqual(defaults.map(({ name, color, icon }) => ({ name, color, icon })), DEFAULT_EVENT_CATEGORIES);
  assert.equal(new Set(defaults.map(row => row.color)).size, 9);
  assert.equal(new Set(defaults.map(row => row.icon)).size, 9);

  const existing = await campaign();
  const personal = await prisma.calendarEventCategory.create({ data: { campaignId: existing.id, name: 'personal', color: '#123456', icon: 'heart', sortOrder: 5 } });
  const custom = await prisma.calendarEventCategory.create({ data: { campaignId: existing.id, name: 'Archives', color: '#654321', sortOrder: 2 } });
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: existing.id, name: 'World', weekdays: [], months: [{ name: 'Rain', length: 30 }], leapDays: [], moons: [], seasons: [] } });
  const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, categoryId: personal.id, title: 'Ren discovers the archive', importance: 'MAJOR' } });
  await prisma.$transaction(tx => initializeEventCategories(tx, existing.id));
  assert.deepEqual(await prisma.calendarEventCategory.findUnique({ where: { id: personal.id } }), personal);
  assert.equal(await prisma.calendarEventCategory.count({ where: { campaignId: existing.id } }), 10);
  assert.equal((await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } })).categoryId, personal.id);

  async function call(handler: typeof updateCalendarEventCategory, body: unknown, categoryId = personal.id, campaignId = existing.id) {
    let status = 200; let result: any;
    const res = { status(code: number) { status = code; return this; }, json(value: unknown) { result = value; } } as unknown as Response;
    await handler({ campaign: { campaignId }, params: { categoryId }, body } as unknown as CampaignScopedRequest, res);
    return { status, result };
  }
  assert.equal((await call(updateCalendarEventCategory, { name: 'Private milestones', color: '#abcdef' })).status, 200);
  assert.equal((await call(deleteCalendarEventCategory, {}, custom.id)).status, 200);
  await prisma.$transaction(tx => initializeEventCategories(tx, existing.id));
  const rows = await prisma.calendarEventCategory.findMany({ where: { campaignId: existing.id } });
  assert.ok(!rows.some(row => ['Personal', 'personal', 'Archives', 'Uncategorized'].includes(row.name)));
  assert.equal(rows.find(row => row.id === personal.id)?.color, '#abcdef');
  const orderedCategoryIds = rows.map(row => row.id).reverse();
  assert.equal((await call(updateCalendarEventCategory, { orderedCategoryIds })).status, 200);
  assert.deepEqual((await call(listCalendarEventCategories, {})).result.categories.map((row: { id: string }) => row.id), orderedCategoryIds);
  assert.equal((await call(updateCalendarEventCategory, { orderedCategoryIds: [defaults[0].id] })).status, 400);
  assert.equal((await call(updateCalendarEventCategory, { name: 'Intrusion' }, defaults[0].id)).status, 404);
  assert.equal((await call(createCalendarEventCategory, { name: ' Uncategorized ' })).status, 400);
  assert.equal((await call(updateCalendarEventCategory, { name: 'Uncategorized' })).status, 400);

  // Category references are campaign IDs, including custom names. Stale/foreign IDs fall back safely.
  for (const categoryId of [personal.id, defaults[0].id, 'deleted-category']) {
    const suggestion = await prisma.campaignWorldEventSuggestion.create({ data: {
      campaignId: existing.id, title: 'A new discovery', status: 'pending', kind: 'faction_pressure',
      occurredAtEpochMinute: 0n, sourceRef: 'test', idempotencyKey: randomUUID(),
      developmentPayload: { developmentType: 'faction_pressure', categoryId, proposedAcceptTarget: 'calendar_event' },
    } });
    const accepted = await resolveWorldDevelopmentSuggestion({ suggestionId: suggestion.id, campaignId: existing.id, campaignHandle: existing.handle, userId: owner.id, role: 'GAMEMASTER', action: 'accept' });
    const generated = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: accepted.calendarEventId } });
    assert.equal(generated.categoryId, categoryId === personal.id ? personal.id : null);
    assert.equal(generated.importance, 'NOTICE');
  }
  await call(deleteCalendarEventCategory, {});
  const savedEvent = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: event.id } });
  assert.equal(savedEvent.categoryId, null);
  assert.equal(savedEvent.importance, 'MAJOR');
  await prisma.$transaction(tx => initializeEventCategories(tx, existing.id));
  assert.equal(await prisma.calendarEventCategory.count({ where: { campaignId: existing.id, name: 'Personal' } }), 0);
});
