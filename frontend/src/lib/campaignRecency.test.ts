import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { CampaignSummary } from '@/types/campaign';
import {
  clearCampaignRecencyForTests,
  getCampaignLastOpenedAt,
  getRecentMemberCampaigns,
  recordCampaignOpened,
  seedCampaignRecencyForTests,
} from './campaignRecency.js';

function campaign(id: string, name = id): CampaignSummary {
  return {
    id,
    handle: id,
    name,
    description: null,
    discoverability: 'PRIVATE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    role: 'GAMEMASTER',
    isMember: true,
  };
}

afterEach(() => {
  clearCampaignRecencyForTests();
});

describe('campaignRecency', () => {
  it('records and reads last opened timestamp', () => {
    recordCampaignOpened('camp-a');
    const ts = getCampaignLastOpenedAt('camp-a');
    assert.ok(ts);
    assert.ok(!Number.isNaN(Date.parse(ts!)));
  });

  it('returns recent member campaigns in strict visit order', () => {
    const now = Date.now();
    seedCampaignRecencyForTests({
      a: new Date(now - 3_600_000).toISOString(),
      b: new Date(now - 1_800_000).toISOString(),
      c: new Date(now - 900_000).toISOString(),
      d: new Date(now - 300_000).toISOString(),
      outsider: new Date(now).toISOString(),
    });

    const members = [
      campaign('a', 'Alpha'),
      campaign('b', 'Bravo'),
      campaign('c', 'Charlie'),
      campaign('d', 'Delta'),
    ];

    const recent = getRecentMemberCampaigns(members, 3).map((c) => c.id);
    assert.deepEqual(recent, ['d', 'c', 'b']);
  });

  it('excludes non-member campaigns from recent list', () => {
    recordCampaignOpened('member');
    recordCampaignOpened('stranger');

    const list = [
      { ...campaign('member'), isMember: true },
      { ...campaign('stranger'), isMember: false },
    ];

    assert.deepEqual(
      getRecentMemberCampaigns(list, 3).map((c) => c.id),
      ['member'],
    );
  });
});
