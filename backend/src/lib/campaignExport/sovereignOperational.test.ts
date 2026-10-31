import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  buildOperationalPayload,
  parseOperationalPayload,
  restoreOperationalPayload,
  SOVEREIGN_OPERATIONAL_PATH,
} from './sovereignOperational.js';

// env.ts reloads development config; restore the isolated fixture selection.
if (process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL) {
  process.env.DATABASE_PROVIDER = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL.startsWith('file:') ? 'sqlite' : 'postgresql';
  process.env.DATABASE_URL = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
}

test('parseOperationalPayload returns null for invalid input', () => {
  assert.equal(parseOperationalPayload(null), null);
  assert.equal(parseOperationalPayload(undefined), null);
});

test('operational payload round-trips bigint project fields as strings', () => {
  const payload = {
    downtimeHavens: [],
    downtimeProjects: [
      {
        id: 'proj-1',
        wikiPageId: 'page-1',
        durationTotalMinutes: '120',
        durationElapsedMinutes: '30',
      },
    ],
    pluginData: [
      {
        id: 'pd-1',
        pluginId: 'settlement-life',
        key: 'state',
        value: { towns: 2 },
      },
    ],
    pluginSettings: [
      {
        pluginId: 'settlement-life',
        isEnabled: true,
        config: { mode: 'lite' },
      },
    ],
  };

  const serialized = JSON.stringify(payload);
  const parsed = parseOperationalPayload(JSON.parse(serialized));
  assert.equal(parsed?.downtimeProjects[0]?.durationTotalMinutes, '120');
  assert.equal(parsed?.pluginData[0]?.pluginId, 'settlement-life');
  assert.equal(SOVEREIGN_OPERATIONAL_PATH, 'sovereign/operational.json');
});

test('buildOperationalPayload is exported for sovereign ZIP assembly', async () => {
  assert.equal(typeof buildOperationalPayload, 'function');
  assert.equal(typeof restoreOperationalPayload, 'function');
});

test('era restore accepts optional normal wiki pages and enforces campaign ownership', async (t) => {
  const { prisma } = await import('../prisma.js');
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `era-restore-${stamp}@example.test`, passwordHash: 'fixture' } });
  t.after(async () => {
    await prisma.campaign.deleteMany({ where: { campaignOwnerUserId: owner.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  });
  const campaign = await prisma.campaign.create({ data: { name: 'Era restore ownership', handle: `era-restore-${stamp}`, campaignOwnerUserId: owner.id } });
  const foreignCampaign = await prisma.campaign.create({ data: { name: 'Other campaign', handle: `era-foreign-${stamp}`, campaignOwnerUserId: owner.id } });
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'History', months: [], weekdays: [], seasons: [], moons: [], leapDays: [] } });
  const foreignCalendar = await prisma.fantasyCalendar.create({ data: { campaignId: foreignCampaign.id, name: 'Other history', months: [], weekdays: [], seasons: [], moons: [], leapDays: [] } });
  const ordinary = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Ordinary lore', visibility: 'Party', metadata: {} } });
  const foreignPage = await prisma.wikiPage.create({ data: { campaignId: foreignCampaign.id, title: 'Other lore', visibility: 'Party', metadata: {} } });
  const era = { id: `era-${stamp}`, calendarId: calendar.id, overviewPageId: ordinary.id, name: 'History', sortOrder: 0, visibility: 'PARTY' };
  const restoreEra = (row: Record<string, unknown>) => restoreOperationalPayload(campaign.id, {
    campaignEras: [row], downtimeHavens: [], downtimeProjects: [], pluginData: [],
  });

  await restoreEra(era);
  const saved = () => prisma.campaignEra.findUniqueOrThrow({ where: { campaignId_id: { campaignId: campaign.id, id: era.id } } });
  assert.equal((await saved()).overviewPageId, ordinary.id);

  for (const references of [
    { overviewPageId: foreignPage.id },
    { overviewPageId: `missing-page-${stamp}` },
    { calendarId: foreignCalendar.id },
    { calendarId: `missing-calendar-${stamp}` },
  ]) {
    await assert.rejects(restoreEra({ ...era, ...references, name: 'Invalid replacement' }), /outside the target campaign/);
    assert.equal((await saved()).name, era.name);
    assert.equal((await saved()).overviewPageId, ordinary.id);
  }

  await restoreEra({ ...era, overviewPageId: null });
  assert.equal((await saved()).overviewPageId, null);
  await restoreEra({ ...era, id: `era-page-free-${stamp}`, overviewPageId: undefined, sortOrder: 1 });
  assert.equal(await prisma.wikiPage.count({ where: { campaignId: campaign.id } }), 1);
  assert.ok(await prisma.wikiPage.findUnique({ where: { id: ordinary.id } }));
});
