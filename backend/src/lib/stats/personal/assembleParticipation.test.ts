import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readMetricAmount, type MetricValue } from '../../../../../shared/metricValue.js';
import {
  assembleParticipationStats,
  buildParticipationHistory,
} from './assembleParticipation.js';

function unavailableReason(value: MetricValue | undefined): string | null {
  return value?.status === 'unavailable' ? value.reason : null;
}

const start = new Date('2026-06-01T00:00:00.000Z');
const end = new Date('2026-07-01T00:00:00.000Z');

describe('assembleParticipationStats', () => {
  it('counts campaigns and completed sessions without treating membership as attendance', () => {
    const stats = assembleParticipationStats({
      participatedCampaigns: [
        { campaignId: 'c1', at: new Date('2026-06-10T00:00:00.000Z') },
        { campaignId: 'c1', at: new Date('2026-06-20T00:00:00.000Z') },
        { campaignId: 'c2', at: new Date('2026-05-01T00:00:00.000Z') },
      ],
      gmedCampaigns: [
        { campaignId: 'c1', at: new Date('2026-01-01T00:00:00.000Z') },
        { campaignId: 'c3', at: new Date('2026-06-05T00:00:00.000Z') },
      ],
      sessionsAttended: [
        {
          timelinePointId: 't1',
          campaignId: 'c1',
          plannedStartAt: new Date('2026-06-10T18:00:00.000Z'),
          plannedEndAt: new Date('2026-06-10T22:00:00.000Z'),
        },
        {
          timelinePointId: 't2',
          campaignId: 'c2',
          plannedStartAt: new Date('2026-05-01T18:00:00.000Z'),
          plannedEndAt: null,
        },
      ],
      sessionsHosted: [
        {
          timelinePointId: 't1',
          campaignId: 'c1',
          plannedStartAt: new Date('2026-06-10T18:00:00.000Z'),
          plannedEndAt: new Date('2026-06-10T22:00:00.000Z'),
        },
      ],
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'owner',
    });
    const byDomain = Object.fromEntries(stats.map((row) => [row.domain, row]));
    assert.equal(readMetricAmount(byDomain.campaignsParticipated?.total), 2);
    assert.equal(readMetricAmount(byDomain.campaignsParticipated?.periodTotal), 1);
    assert.equal(readMetricAmount(byDomain.campaignsGmed?.total), 2);
    assert.equal(readMetricAmount(byDomain.campaignsGmed?.periodTotal), 1);
    assert.equal(readMetricAmount(byDomain.sessionsAttended?.total), 2);
    assert.equal(readMetricAmount(byDomain.sessionsAttended?.periodTotal), 1);
    assert.equal(readMetricAmount(byDomain.sessionsHosted?.total), 1);
    assert.equal(byDomain.sessionsAttended?.plannedDurationMinutes?.status, 'estimated');
    assert.equal(readMetricAmount(byDomain.sessionsAttended?.plannedDurationMinutes), 240);
    assert.equal(
      unavailableReason(byDomain.sessionsAttended?.playedDurationMinutes),
      'not_yet_tracked',
    );
  });

  it('hides period participation from public visibility', () => {
    const stats = assembleParticipationStats({
      participatedCampaigns: [{ campaignId: 'c1', at: start }],
      gmedCampaigns: [],
      sessionsAttended: [],
      sessionsHosted: [],
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'public',
    });
    const participated = stats.find((row) => row.domain === 'campaignsParticipated');
    assert.equal(readMetricAmount(participated?.total), 1);
    assert.equal(unavailableReason(participated?.periodTotal), 'private');
  });
});

describe('buildParticipationHistory', () => {
  it('merges attended and hosted roles and sorts by planned start', () => {
    const history = buildParticipationHistory({
      attended: [
        {
          timelinePointId: 't-old',
          campaignId: 'c1',
          plannedStartAt: new Date('2026-05-01T18:00:00.000Z'),
          plannedEndAt: new Date('2026-05-01T21:00:00.000Z'),
        },
        {
          timelinePointId: 't-both',
          campaignId: 'c1',
          plannedStartAt: new Date('2026-06-10T18:00:00.000Z'),
          plannedEndAt: new Date('2026-06-10T22:00:00.000Z'),
        },
      ],
      hosted: [
        {
          timelinePointId: 't-both',
          campaignId: 'c1',
          plannedStartAt: new Date('2026-06-10T18:00:00.000Z'),
          plannedEndAt: new Date('2026-06-10T22:00:00.000Z'),
        },
      ],
      limit: 10,
    });
    assert.equal(history[0]?.timelinePointId, 't-both');
    assert.deepEqual(history[0]?.roles.sort(), ['attended', 'hosted']);
    assert.equal(history[0]?.plannedDurationMinutes, 240);
    assert.equal(history[1]?.timelinePointId, 't-old');
  });
});
