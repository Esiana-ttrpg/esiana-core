import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assembleActiveCampaigns } from './assembleActiveCampaigns.js';

describe('assembleActiveCampaigns', () => {
  const campaigns = new Map([
    [
      'c1',
      {
        id: 'c1',
        name: 'The Shattered Crown',
        handle: 'shattered-crown',
        coverImageUrl: '/api/assets/crown',
      },
    ],
    [
      'c2',
      {
        id: 'c2',
        name: 'Whispers of the Vale',
        handle: 'whispers',
        coverImageUrl: null,
      },
    ],
    [
      'c3',
      {
        id: 'c3',
        name: 'Quiet Table',
        handle: 'quiet',
        coverImageUrl: null,
      },
    ],
  ]);

  it('ranks by active days then contributions, never by word volume', () => {
    const result = assembleActiveCampaigns({
      timeZone: 'UTC',
      rangeStart: new Date('2026-06-01T00:00:00.000Z'),
      rangeEnd: new Date('2026-07-01T00:00:00.000Z'),
      campaigns,
      points: [
        // Crown: 2 days, 3 events, 2 pages
        {
          campaignId: 'c1',
          at: new Date('2026-06-02T12:00:00.000Z'),
          pageId: 'p1',
        },
        {
          campaignId: 'c1',
          at: new Date('2026-06-02T18:00:00.000Z'),
          pageId: 'p2',
        },
        {
          campaignId: 'c1',
          at: new Date('2026-06-05T12:00:00.000Z'),
          pageId: 'p1',
        },
        // Vale: 3 days, 3 events (wins on active days)
        {
          campaignId: 'c2',
          at: new Date('2026-06-01T12:00:00.000Z'),
          pageId: 'v1',
        },
        {
          campaignId: 'c2',
          at: new Date('2026-06-03T12:00:00.000Z'),
        },
        {
          campaignId: 'c2',
          at: new Date('2026-06-04T12:00:00.000Z'),
        },
      ],
    });

    assert.equal(result.length, 2);
    assert.equal(result[0]?.handle, 'whispers');
    assert.equal(result[0]?.activeDays, 3);
    assert.equal(result[0]?.contributions, 3);
    assert.equal(result[1]?.handle, 'shattered-crown');
    assert.equal(result[1]?.activeDays, 2);
    assert.equal(result[1]?.pagesTouched, 2);
    assert.equal(result[1]?.coverImageUrl, '/api/assets/crown');
  });

  it('omits campaigns with no in-window activity and caps at three', () => {
    const many = new Map(campaigns);
    many.set('c4', {
      id: 'c4',
      name: 'Fourth',
      handle: 'fourth',
      coverImageUrl: null,
    });
    many.set('c5', {
      id: 'c5',
      name: 'Fifth',
      handle: 'fifth',
      coverImageUrl: null,
    });
    const result = assembleActiveCampaigns({
      timeZone: 'UTC',
      rangeStart: new Date('2026-06-01T00:00:00.000Z'),
      rangeEnd: new Date('2026-07-01T00:00:00.000Z'),
      campaigns: many,
      points: [
        { campaignId: 'c1', at: new Date('2026-06-02T12:00:00.000Z') },
        { campaignId: 'c2', at: new Date('2026-06-02T12:00:00.000Z') },
        { campaignId: 'c4', at: new Date('2026-06-02T12:00:00.000Z') },
        { campaignId: 'c5', at: new Date('2026-06-02T12:00:00.000Z') },
        // outside window
        { campaignId: 'c3', at: new Date('2026-05-01T12:00:00.000Z') },
      ],
    });
    assert.equal(result.length, 3);
    assert.ok(!result.some((row) => row.handle === 'quiet'));
  });
});
