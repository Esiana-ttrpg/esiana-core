import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

// Stub the Prisma boundary before importing the builders; no database is used.
const lookup = mock.fn(async (_args: unknown): Promise<unknown> => null);
const locationLookup = mock.fn(async (_args: unknown) => null);
(globalThis as unknown as { prisma: unknown }).prisma = {
  campaignSessionSchedule: { findFirst: lookup }, wikiPage: { findFirst: locationLookup },
};
const { fetchLastDashboardSession, fetchNextDashboardSession } = await import('./buildDashboardSessions.js');

test('last-session lookup requires completion and a visible, undeleted campaign page', async () => {
  lookup.mock.resetCalls();
  try {
    assert.equal(await fetchLastDashboardSession('campaign-a', CampaignMemberRoles.PARTICIPANT), null);
    const query = lookup.mock.calls[0].arguments[0] as unknown as { where: Record<string, unknown> };
    assert.equal(query.where.status, 'COMPLETED');
    assert.deepEqual(query.where.timelinePoint, {
      campaignId: 'campaign-a',
      wikiPage: { deletedAt: null, visibility: { in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY] } },
    });
    // There is deliberately no fallback to a future or unscheduled anchor.
    assert.equal(lookup.mock.callCount(), 1);
  } finally { lookup.mock.resetCalls(); }
});

test('recorded scheduling details retain their timezone and never expose a hidden location ID', async () => {
  lookup.mock.mockImplementationOnce(async () => ({
    timelinePointId: 'session-4', status: 'PUBLISHED', plannedStartAt: new Date('2030-01-03T19:00:00Z'),
    plannedEndAt: new Date('2030-01-03T22:00:00Z'), timezone: 'America/Los_Angeles', venueLabel: 'The library',
    venueType: 'IN_PERSON', locationPageId: 'hidden-location', timelinePoint: { sequenceOrder: 4, wikiPage: { title: 'The missing atlas' } },
  }));
  locationLookup.mock.resetCalls();
  const result = await fetchNextDashboardSession('campaign-a', CampaignMemberRoles.PARTICIPANT);
  assert.equal(result?.timezone, 'America/Los_Angeles');
  assert.equal(result?.venueLabel, 'The library');
  assert.equal(result?.locationTitle, null);
  assert.ok(!JSON.stringify(result).includes('hidden-location'));
  const query = locationLookup.mock.calls[0].arguments[0] as { where: Record<string, unknown> };
  assert.deepEqual(query.where, { id: 'hidden-location', campaignId: 'campaign-a', deletedAt: null,
    visibility: { in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY] } });
});

test('upcoming-session visibility follows the viewer role, including read-only public views', async () => {
  lookup.mock.resetCalls();
  try {
    for (const role of [null, CampaignMemberRoles.OBSERVER, CampaignMemberRoles.GAMEMASTER]) {
      await fetchNextDashboardSession('campaign-a', role);
    }
    const pages = lookup.mock.calls.map((call) => (call.arguments[0] as unknown as {
      where: { timelinePoint: { wikiPage: unknown } };
    }).where.timelinePoint.wikiPage);
    assert.deepEqual(pages, [
      { deletedAt: null, visibility: { in: [WikiVisibility.PUBLIC] } },
      { deletedAt: null, visibility: { in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY] } },
      { deletedAt: null },
    ]);
    const query = lookup.mock.calls[0].arguments[0] as { where: { OR: unknown[] } };
    assert.equal(query.where.OR.length, 2, 'future sessions and ongoing dated ranges are selected without including completed placeholders');
  } finally { lookup.mock.resetCalls(); }
});
