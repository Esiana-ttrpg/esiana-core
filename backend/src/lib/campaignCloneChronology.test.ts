import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';
import { duplicateCampaign } from './campaignClone.js';
import { initializeEventCategories } from './defaultEventCategories.js';
import { mergeEventConsequenceSetIntoMetadata, readEventConsequencesFromMetadata } from '../../../shared/eventConsequence.js';
import type { CampaignCloneOptions } from './campaignCloneOptions.js';

if (process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL) {
  process.env.DATABASE_PROVIDER = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL.startsWith('file:') ? 'sqlite' : 'postgresql';
  process.env.DATABASE_URL = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
}

test('campaign duplication links copied events only to copied wiki documents', async t => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `clone-chronology-${stamp}@example.test`, passwordHash: 'fixture' } });
  const source = await prisma.campaign.create({ data: { name: 'Source Chronicle', handle: `clone-source-${stamp}`, campaignOwnerUserId: owner.id } });
  const campaigns = [source.id];
  await prisma.$transaction(tx => initializeEventCategories(tx, source.id, { newCampaign: true }));
  await prisma.calendarEventCategory.deleteMany({ where: { campaignId: source.id, name: 'Conflict' } });
  await prisma.calendarEventCategory.updateMany({ where: { campaignId: source.id, name: 'Discovery' }, data: { name: 'Archives', color: '#123456', sortOrder: -1 } });
  t.after(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: campaigns } } });
    await prisma.user.delete({ where: { id: owner.id } }); await prisma.$disconnect();
  });
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: source.id, name: 'History', months: [], weekdays: [], seasons: [], moons: [], leapDays: [] } });
  const document = await prisma.wikiPage.create({ data: { campaignId: source.id, title: 'Riverlight Chronicle', visibility: 'Party', metadata: { chronologyDocument: 'event' } } });
  await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'Riverlight Discovery', wikiPageId: document.id,
    metadata: mergeEventConsequenceSetIntoMetadata({ preserved: true }, [{ id: 'route', kind: 'route_change', payload: { severity: 'minor' }, targets: {
      pageIds: [document.id, 'missing-page'], havenIds: [document.id], locationIds: [document.id, 'missing-location'],
    } }]) as any,
  } });
  await prisma.calendarEvent.create({ data: { calendarId: calendar.id, title: 'A Quiet Anniversary' } });
  const options: CampaignCloneOptions = {
    structure: { wikiPages: true, folderStructure: true, sidebarLayout: false },
    recruitment: { settings: false, tableStyleTags: false, safety: false, publicDocs: false },
    scheduling: { calendarStructure: true, sessionCadence: false, sessionEventsLogs: true },
    gameplay: { characters: false, inventoryState: false, mapsAssets: false, diceHistory: false },
    community: { members: false, joinRequests: false, chatHistory: false },
  };
  const clone = async (copy: CampaignCloneOptions, suffix: string) => {
    const result = await duplicateCampaign({ sourceCampaignId: source.id, ownerUserId: owner.id, name: `Copied Chronicle ${suffix} ${stamp}`, discoverability: 'PRIVATE', copy });
    campaigns.push(result.campaignId);
    return prisma.calendarEvent.findMany({ where: { calendar: { campaignId: result.campaignId } }, include: { wikiPage: true } });
  };
  const copied = await clone(options, 'with-documents');
  await prisma.$transaction(tx => initializeEventCategories(tx, campaigns[1]));
  const copiedCategories = await prisma.calendarEventCategory.findMany({ where: { campaignId: campaigns[1] }, orderBy: { sortOrder: 'asc' } });
  assert.equal(copiedCategories.length, 8);
  assert.equal(copiedCategories[0].name, 'Archives');
  assert.equal(copiedCategories[0].color, '#123456');
  assert.equal(copiedCategories[0].icon, 'compass');
  assert.equal(copied.length, 2);
  const linked = copied.find(event => event.title === 'Riverlight Discovery')!;
  assert.ok(linked.wikiPageId);
  assert.notEqual(linked.wikiPageId, document.id);
  assert.equal(linked.wikiPage?.campaignId, campaigns[1]);
  assert.equal(linked.wikiPage?.title, document.title);
  assert.deepEqual(readEventConsequencesFromMetadata(linked.metadata)[0].targets, { pageIds: [linked.wikiPageId], havenIds: [linked.wikiPageId], locationIds: [linked.wikiPageId] });
  assert.equal((linked.metadata as Record<string, unknown>).preserved, true);
  assert.equal(copied.find(event => event.title === 'A Quiet Anniversary')?.wikiPageId, null);
  const withoutDocuments = await clone({ ...options, structure: { ...options.structure, wikiPages: false } }, 'without-documents');
  assert.equal(withoutDocuments.length, 2);
  assert.ok(withoutDocuments.every(event => event.wikiPageId === null), 'unmapped pages never leave source-campaign links on copied events');
  assert.equal(readEventConsequencesFromMetadata(withoutDocuments.find(event => event.title === 'Riverlight Discovery')!.metadata)[0].targets, undefined);
  assert.equal((await prisma.wikiPage.findUniqueOrThrow({ where: { id: document.id } })).campaignId, source.id);
});
