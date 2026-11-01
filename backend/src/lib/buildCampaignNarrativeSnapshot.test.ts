import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import { getDefaultDashboardConfig } from './dashboardConfig.js';
import type { DashboardSummary } from './buildDashboardSummary.js';

const findMany = mock.fn(async (_query: unknown): Promise<unknown[]> => []);
const findFirst = mock.fn(async () => null);
(globalThis as unknown as { prisma: unknown }).prisma = {
  wikiPage: { findMany }, partyRegionVisit: { findFirst },
};
const { buildCampaignNarrativeSnapshot } = await import('./buildCampaignNarrativeSnapshot.js');
const summary = {
  chronometer: null, nextSession: null, lastSession: null, schedule: {},
  party: { members: [] }, recent: { items: [] },
} as unknown as DashboardSummary;

test('hidden arcs and party portraits never enter player or public summaries', async () => {
  findMany.mock.mockImplementation(async (query) => {
    const arc = (query as { where: { templateType?: string } }).where.templateType === 'ARC';
    return arc ? [{ title: 'Hidden revelation', visibility: WikiVisibility.DM_ONLY,
      metadata: {}, blocks: [{ type: 'text-tiptap', content: { markdown: 'Secret arc prose' } }],
    }] : [
      { id: 'hidden', title: 'Hidden companion', visibility: WikiVisibility.DM_ONLY, metadata: { partyParticipation: { active: true }, appearance: { portraitUrl: 'asset:hidden' } } },
      { id: 'visible', title: 'Juniper', visibility: WikiVisibility.PUBLIC, workspace: 'CHARACTERS', pathKey: 'juniper', metadata: { partyParticipation: { active: true } } },
    ];
  });
  for (const role of [CampaignMemberRoles.PARTICIPANT, CampaignMemberRoles.OBSERVER, null]) {
    const snapshot = await buildCampaignNarrativeSnapshot({ campaignId: 'campaign-a', campaignHandle: 'campaign-a', role,
      dashboardConfig: getDefaultDashboardConfig(), summary, questPages: [], threadBundle: { living: [], theories: [], recentlyResolved: [] }, campaignDescription: null });
    assert.equal(snapshot.currentStory.arcProse, null);
    assert.equal(snapshot.currentStory.arcTitle, null);
    assert.deepEqual(snapshot.partyRoster.members.map((item) => item.title), ['Juniper']);
    assert.equal(snapshot.campaignState.partySummary.count, 1);
    assert.ok(!JSON.stringify(snapshot).includes('Hidden'));
    assert.ok(!JSON.stringify(snapshot).includes('Secret'));
    assert.equal(snapshot.campaignState.nextSession.emptyPrompt, null);
  }
  const gm = await buildCampaignNarrativeSnapshot({ campaignId: 'campaign-a', campaignHandle: 'campaign-a', role: CampaignMemberRoles.GAMEMASTER,
    dashboardConfig: getDefaultDashboardConfig(), summary, questPages: [], threadBundle: { living: [], theories: [], recentlyResolved: [] }, campaignDescription: null });
  assert.equal(gm.currentStory.arcTitle, 'Hidden revelation');
  assert.equal(gm.currentStory.arcProse, 'Secret arc prose');
  assert.equal(gm.partyRoster.members.length, 2);
  for (const call of findMany.mock.calls) {
    assert.equal((call.arguments[0] as { where: { campaignId: string } }).where.campaignId, 'campaign-a');
  }
});
