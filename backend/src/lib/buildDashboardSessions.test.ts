import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';

// Stub the Prisma boundary before importing the builders; no database is used.
const lookup = mock.fn(async (_args: unknown) => null);
(globalThis as unknown as { prisma: unknown }).prisma = { campaignSessionSchedule: { findFirst: lookup } };
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
  } finally { lookup.mock.resetCalls(); }
});
