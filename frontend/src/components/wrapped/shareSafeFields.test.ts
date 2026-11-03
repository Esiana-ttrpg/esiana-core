import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricValue } from '@shared/metricValue';
import type { WrappedYearResponse } from '@shared/wrappedTypes';
import {
  WRAPPED_SCHEMA_VERSION,
  WRAPPED_WRITING_RELIABLE_FROM,
} from '@shared/wrappedTypes';
import {
  assertNoCampaignIdsInShareModel,
  buildShareSafeFinalCard,
} from './shareSafeFields';

function sampleResponse(): WrappedYearResponse {
  return {
    version: 1,
    year: 2026,
    edition: 'preview',
    timeZone: 'UTC',
    generatedAt: '2026-12-20T00:00:00.000Z',
    regeneratedAt: null,
    calculation: {
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
        personal: {
          'period.wordsAdded': metricValue(84600),
          'period.pagesCreated': metricValue(12),
          'period.pagesEdited': metricValue(40),
        },
        byCampaign: {
          secret: { activeDays: 9, contributions: 20, pagesTouched: 4 },
        },
        participation: {
          sessionsAttended: metricValue(38),
          sessionsHosted: metricValue(4),
          campaignsParticipated: metricValue(4),
        },
        shared: {
          fellowAdventurerCount: metricValue(6),
          sessionsWithOthers: metricValue(10),
        },
        comparative: {
          previousYear: null,
          previousEligible: false,
          deltas: {},
        },
      },
      topCampaign: {
        campaignId: 'secret',
        activeDays: 9,
        contributions: 20,
        pagesTouched: 4,
        ranking: 'active_campaigns_v1',
      },
      referencedCampaignIds: ['secret'],
      archetypes: {
        dominantId: 'chronicler',
        scores: [{ id: 'chronicler', score: 1 }],
      },
      biggestMonth: null,
      monthlyActivity: [],
    },
    presentation: {
      campaigns: {
        secret: {
          id: 'secret',
          name: 'Hidden Realm',
          handle: 'hidden',
          href: '/campaigns/hidden/dashboard',
          coverImageUrl: 'https://cdn.example/cover.jpg',
          authorized: true,
        },
      },
      redactedCampaignIds: [],
    },
    slideManifest: [],
  };
}

describe('buildShareSafeFinalCard', () => {
  it('uses allowlisted personal totals and omits campaign presentation', () => {
    const model = buildShareSafeFinalCard(sampleResponse(), 'storyteller');
    assert.equal(model.year, 2026);
    assert.ok(model.fields.some((f) => f.id === 'personal.period.wordsAdded'));
    assertNoCampaignIdsInShareModel(model);
    assert.equal(JSON.stringify(model).includes('Hidden Realm'), false);
    assert.equal(JSON.stringify(model).includes('cover.jpg'), false);
  });

  it('changes featured fields by preset', () => {
    const adventurer = buildShareSafeFinalCard(sampleResponse(), 'adventurer');
    const worldbuilder = buildShareSafeFinalCard(sampleResponse(), 'worldbuilder');
    assert.ok(
      adventurer.fields.some((f) => f.id === 'participation.sessionsAttended'),
    );
    assert.ok(
      worldbuilder.fields.some((f) => f.id === 'personal.period.pagesCreated'),
    );
  });
});
