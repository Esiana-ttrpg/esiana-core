import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readMetricAmount } from '../../../../shared/metricValue.js';
import { assembleLifetimeAttributionMetrics } from './buildUserCreatorAttribution.js';

function page(input: {
  campaignId: string;
  templateType?: string;
  entityCategory?: string;
  wordCount?: number;
}) {
  return {
    campaignId: input.campaignId,
    templateType: input.templateType ?? 'DEFAULT',
    metadata: input.entityCategory
      ? { entityCategory: input.entityCategory }
      : {},
    stats: { wordCount: input.wordCount ?? 0 },
  };
}

describe('assembleLifetimeAttributionMetrics', () => {
  it('sums current word counts on pages the user created, including later editors', () => {
    const metrics = assembleLifetimeAttributionMetrics({
      createdPages: [
        page({ campaignId: 'public-table', wordCount: 100 }),
        page({ campaignId: 'private-table', wordCount: 50 }),
      ],
      editCount: 0,
      linkCount: 0,
      actorEventCampaignIds: [],
    });
    assert.equal(readMetricAmount(metrics['attribution.totalWordsCreated']), 150);
    assert.equal(readMetricAmount(metrics['attribution.pagesCreated']), 2);
  });

  it('does not credit words from pages the user did not create', () => {
    const metrics = assembleLifetimeAttributionMetrics({
      createdPages: [page({ campaignId: 'c1', wordCount: 20 })],
      editCount: 7,
      linkCount: 0,
      actorEventCampaignIds: ['c1', 'c2'],
    });
    assert.equal(readMetricAmount(metrics['attribution.totalWordsCreated']), 20);
    assert.equal(readMetricAmount(metrics['attribution.totalEdits']), 7);
  });

  it('counts characters, locations, and organizations from metadata template only', () => {
    const metrics = assembleLifetimeAttributionMetrics({
      createdPages: [
        page({ campaignId: 'c1', entityCategory: 'characters', wordCount: 10 }),
        page({ campaignId: 'c1', entityCategory: 'locations', wordCount: 10 }),
        page({ campaignId: 'c1', entityCategory: 'organizations', wordCount: 10 }),
        page({ campaignId: 'c1', wordCount: 10 }),
      ],
      editCount: 0,
      linkCount: 3,
      actorEventCampaignIds: [],
    });
    assert.equal(readMetricAmount(metrics['attribution.charactersCreated']), 1);
    assert.equal(readMetricAmount(metrics['attribution.locationsCreated']), 1);
    assert.equal(readMetricAmount(metrics['attribution.organizationsCreated']), 1);
    assert.equal(readMetricAmount(metrics['attribution.connectionsCreated']), 3);
    assert.equal(readMetricAmount(metrics['attribution.pagesCreated']), 4);
  });

  it('counts tables from created pages or any actor events, not membership alone', () => {
    const createdOnly = assembleLifetimeAttributionMetrics({
      createdPages: [page({ campaignId: 'alpha', wordCount: 1 })],
      editCount: 0,
      linkCount: 0,
      actorEventCampaignIds: [],
    });
    assert.equal(
      readMetricAmount(createdOnly['attribution.campaignsContributedCount']),
      1,
    );

    const eventsOnly = assembleLifetimeAttributionMetrics({
      createdPages: [],
      editCount: 2,
      linkCount: 0,
      actorEventCampaignIds: ['beta'],
    });
    assert.equal(
      readMetricAmount(eventsOnly['attribution.campaignsContributedCount']),
      1,
    );

    const union = assembleLifetimeAttributionMetrics({
      createdPages: [page({ campaignId: 'alpha', wordCount: 1 })],
      editCount: 1,
      linkCount: 0,
      actorEventCampaignIds: ['alpha', 'beta'],
    });
    assert.equal(readMetricAmount(union['attribution.campaignsContributedCount']), 2);
  });

  it('treats missing page stats as zero words', () => {
    const metrics = assembleLifetimeAttributionMetrics({
      createdPages: [
        {
          campaignId: 'c1',
          templateType: 'DEFAULT',
          metadata: {},
          stats: null,
        },
      ],
      editCount: 0,
      linkCount: 0,
      actorEventCampaignIds: [],
    });
    assert.equal(readMetricAmount(metrics['attribution.totalWordsCreated']), 0);
    assert.equal(metrics['attribution.totalWordsCreated']?.status, 'zero');
  });
});
