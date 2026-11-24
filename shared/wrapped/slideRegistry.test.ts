import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricUnavailable, metricValue } from '../metricValue.js';
import {
  resolveEditionTier,
  resolveWrappedInviteAvailability,
  selectWrappedSlideIds,
  WRAPPED_SLIDE_REGISTRY,
} from './slideRegistry.js';
import type { WrappedCalculationV1 } from '../wrappedTypes.js';
import { WRAPPED_SCHEMA_VERSION, WRAPPED_WRITING_RELIABLE_FROM } from '../wrappedTypes.js';

function emptyCalc(overrides: Partial<WrappedCalculationV1> = {}): WrappedCalculationV1 {
  return {
    schemaVersion: WRAPPED_SCHEMA_VERSION,
    year: 2026,
    timeZone: 'UTC',
    generatedAt: new Date().toISOString(),
    edition: 'preview',
    slideIds: [],
    editionTier: 'unavailable',
    coverage: [
      { family: 'writing', status: 'partial' },
      { family: 'worldbuilding', status: 'measured' },
      { family: 'cartography', status: 'not_yet_tracked' },
      { family: 'chronology', status: 'not_yet_tracked' },
      { family: 'participation', status: 'measured' },
      { family: 'campaigns', status: 'measured' },
      { family: 'sharedAttendance', status: 'not_yet_tracked' },
      { family: 'comparative', status: 'unavailable' },
    ],
    coverageDisclosure: {
      writingReliableFrom: WRAPPED_WRITING_RELIABLE_FROM,
      isPartialYearWriting: true,
    },
    metrics: {
      personal: {},
      byCampaign: {},
      participation: {
        sessionsAttended: metricUnavailable('not_yet_tracked'),
        sessionsHosted: metricUnavailable('not_yet_tracked'),
        campaignsParticipated: metricUnavailable('not_yet_tracked'),
      },
      shared: {
        fellowAdventurerCount: metricUnavailable('not_yet_tracked'),
        sessionsWithOthers: metricUnavailable('not_yet_tracked'),
      },
      comparative: {
        previousYear: null,
        previousEligible: false,
        deltas: {},
      },
    },
    topCampaign: null,
    referencedCampaignIds: [],
    archetypes: null,
    biggestMonth: null,
    monthlyActivity: [],
    ...overrides,
  };
}

describe('resolveEditionTier', () => {
  it('classifies full, short, and unavailable', () => {
    assert.equal(resolveEditionTier(10), 'full');
    assert.equal(resolveEditionTier(5), 'short');
    assert.equal(resolveEditionTier(2), 'unavailable');
  });
});

describe('resolveWrappedInviteAvailability', () => {
  it('maps edition tiers to seasonal discovery states', () => {
    assert.equal(resolveWrappedInviteAvailability('full'), 'ready');
    assert.equal(resolveWrappedInviteAvailability('short'), 'limited');
    assert.equal(resolveWrappedInviteAvailability('unavailable'), 'unavailable');
  });
});

describe('selectWrappedSlideIds', () => {
  it('always bookends with intro and summary', () => {
    const ids = selectWrappedSlideIds(emptyCalc());
    assert.equal(ids[0], 'year-intro');
    assert.equal(ids[ids.length - 1], 'year-summary');
  });

  it('omits fellow-adventurers without attendance coverage', () => {
    const calc = emptyCalc({
      metrics: {
        ...emptyCalc().metrics,
        shared: {
          fellowAdventurerCount: metricValue(4),
          sessionsWithOthers: metricValue(2),
        },
      },
      coverage: emptyCalc().coverage.map((c) =>
        c.family === 'sharedAttendance'
          ? { ...c, status: 'not_yet_tracked' }
          : c,
      ),
    });
    const ids = selectWrappedSlideIds(calc);
    assert.equal(ids.includes('fellow-adventurers'), false);
  });

  it('includes fellow-adventurers when measured and positive', () => {
    const calc = emptyCalc({
      metrics: {
        ...emptyCalc().metrics,
        shared: {
          fellowAdventurerCount: metricValue(3),
          sessionsWithOthers: metricValue(2),
        },
      },
      coverage: emptyCalc().coverage.map((c) =>
        c.family === 'sharedAttendance' ? { ...c, status: 'measured' } : c,
      ),
    });
    const ids = selectWrappedSlideIds(calc);
    assert.equal(ids.includes('fellow-adventurers'), true);
  });

  it('does not treat eight slides as an all-or-nothing gate', () => {
    const calc = emptyCalc({
      metrics: {
        ...emptyCalc().metrics,
        byCampaign: {
          c1: { activeDays: 3, contributions: 5, pagesTouched: 2 },
        },
        participation: {
          sessionsAttended: metricValue(2),
          sessionsHosted: metricValue(0),
          campaignsParticipated: metricValue(1),
        },
        personal: {
          'period.wordsAdded': metricValue(100),
          'period.pagesCreated': metricValue(2),
        },
      },
      topCampaign: {
        campaignId: 'c1',
        activeDays: 3,
        contributions: 5,
        pagesTouched: 2,
        ranking: 'active_campaigns_v1',
      },
      biggestMonth: { month: 11, activeDays: 4, contributions: 6 },
      monthlyActivity: [{ month: 11, activeDays: 4, contributions: 6 }],
      referencedCampaignIds: ['c1'],
    });
    const ids = selectWrappedSlideIds(calc);
    const tier = resolveEditionTier(ids.length);
    assert.ok(tier === 'short' || tier === 'full');
    assert.ok(ids.length >= 3);
  });
});

describe('WRAPPED_SLIDE_REGISTRY', () => {
  it('marks intro and summary mandatory', () => {
    const mandatory = WRAPPED_SLIDE_REGISTRY.filter((s) => s.mandatory).map((s) => s.id);
    assert.deepEqual(mandatory, ['year-intro', 'year-summary']);
  });
});
