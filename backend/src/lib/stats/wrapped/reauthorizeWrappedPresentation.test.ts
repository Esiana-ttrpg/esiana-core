import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricValue } from '../../../../../shared/metricValue.js';
import type { WrappedCalculationV1 } from '../../../../../shared/wrappedTypes.js';
import {
  WRAPPED_SCHEMA_VERSION,
  WRAPPED_WRITING_RELIABLE_FROM,
} from '../../../../../shared/wrappedTypes.js';

/**
 * Pure helper mirroring the ranking re-pick used when top campaign is redacted.
 * Keeps the active-campaign lexicographic contract without hitting Prisma.
 */
function repickTopCampaign(
  byCampaign: WrappedCalculationV1['metrics']['byCampaign'],
  names: Record<string, string>,
): WrappedCalculationV1['topCampaign'] {
  const remaining = Object.entries(byCampaign)
    .map(([campaignId, row]) => ({
      campaignId,
      ...row,
      name: names[campaignId] ?? campaignId,
    }))
    .filter((row) => row.contributions > 0)
    .sort((a, b) => {
      if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
      if (b.contributions !== a.contributions) return b.contributions - a.contributions;
      return a.name.localeCompare(b.name);
    });
  const next = remaining[0];
  return next
    ? {
        campaignId: next.campaignId,
        activeDays: next.activeDays,
        contributions: next.contributions,
        pagesTouched: next.pagesTouched,
        ranking: 'active_campaigns_v1',
      }
    : null;
}

describe('lost-access campaign redaction ranking', () => {
  it('re-picks top campaign among authorized campaigns using active-campaign order', () => {
    const byCampaign = {
      privateLost: { activeDays: 10, contributions: 20, pagesTouched: 5 },
      stillMine: { activeDays: 4, contributions: 8, pagesTouched: 2 },
      alsoMine: { activeDays: 4, contributions: 9, pagesTouched: 1 },
    };
    delete byCampaign.privateLost;
    const top = repickTopCampaign(byCampaign, {
      stillMine: 'Zephyr',
      alsoMine: 'Aurora',
    });
    // Same active days → higher contributions wins (alsoMine).
    assert.equal(top?.campaignId, 'alsoMine');
    assert.equal(top?.ranking, 'active_campaigns_v1');
  });

  it('clears top campaign when no authorized campaigns remain', () => {
    const top = repickTopCampaign({}, {});
    assert.equal(top, null);
  });
});

describe('calculation payload shape', () => {
  it('does not require presentation fields on the durable calculation', () => {
    const calc: WrappedCalculationV1 = {
      schemaVersion: WRAPPED_SCHEMA_VERSION,
      year: 2026,
      timeZone: 'UTC',
      generatedAt: '2026-12-20T00:00:00.000Z',
      edition: 'preview',
      slideIds: ['year-intro', 'year-summary'],
      editionTier: 'short',
      coverage: [],
      coverageDisclosure: {
        writingReliableFrom: WRAPPED_WRITING_RELIABLE_FROM,
        isPartialYearWriting: true,
      },
      metrics: {
        personal: { 'period.wordsAdded': metricValue(10) },
        byCampaign: {
          c1: { activeDays: 1, contributions: 2, pagesTouched: 1 },
        },
        participation: {
          sessionsAttended: metricValue(0),
          sessionsHosted: metricValue(0),
          campaignsParticipated: metricValue(1),
        },
        shared: {
          fellowAdventurerCount: metricValue(0),
          sessionsWithOthers: metricValue(0),
        },
        comparative: {
          previousYear: null,
          previousEligible: false,
          deltas: {},
        },
      },
      topCampaign: {
        campaignId: 'c1',
        activeDays: 1,
        contributions: 2,
        pagesTouched: 1,
        ranking: 'active_campaigns_v1',
      },
      referencedCampaignIds: ['c1'],
      archetypes: null,
      biggestMonth: null,
      monthlyActivity: [],
    };
    assert.equal('name' in (calc.topCampaign as object), false);
    assert.ok(!('coverImageUrl' in calc));
  });
});
