import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOperationalPayload,
  parseOperationalPayload,
  restoreOperationalPayload,
  SOVEREIGN_OPERATIONAL_PATH,
} from './sovereignOperational.js';

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

test('era restore ownership validation requires an era Overview page', async (t) => {
  const { prisma } = await import('../prisma.js');
  const owner = await prisma.user.create({ data: { email: `era-restore-${Date.now()}@example.test`, passwordHash: 'fixture' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Era restore ownership', handle: `era-restore-${Date.now()}`, campaignOwnerUserId: owner.id } });
  t.after(async () => { await prisma.campaign.delete({ where: { id: campaign.id } }); await prisma.user.delete({ where: { id: owner.id } }); });
  const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'History', months: [], weekdays: [], seasons: [], moons: [], leapDays: [] } });
  const ordinary = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Ordinary lore', visibility: 'Party', metadata: {} } });
  await assert.rejects(restoreOperationalPayload(campaign.id, {
    campaignEras: [{ id: 'era-invalid', calendarId: calendar.id, overviewPageId: ordinary.id, name: 'Invalid', sortOrder: 0, visibility: 'PARTY' }],
    downtimeHavens: [], downtimeProjects: [], pluginData: [],
  }), /outside the target campaign/);
});
