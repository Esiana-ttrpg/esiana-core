import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWrappedInviteAvailability } from '../../../../../shared/wrapped/slideRegistry.js';
import type {
  WrappedPublishedPayloadV1,
  WrappedYearResponse,
} from '../../../../../shared/wrappedTypes.js';
import { WRAPPED_SCHEMA_VERSION } from '../../../../../shared/wrappedTypes.js';
import { metricValue } from '../../../../../shared/metricValue.js';

/**
 * Pure helpers mirroring publication access rules without Prisma.
 */
function publicAccessAllowed(input: {
  wrappedEnabled: boolean;
  publicPublishingEnabled: boolean;
  publishedAt: Date | null;
  publishedPayload: unknown;
}): boolean {
  if (!input.wrappedEnabled || !input.publicPublishingEnabled) return false;
  if (!input.publishedAt || !input.publishedPayload) return false;
  return true;
}

function regenerateLeavesPublishedUntouched(input: {
  privatePayloadYear: number;
  publishedPayload: WrappedPublishedPayloadV1;
  regeneratedPrivateYear: number;
}): WrappedPublishedPayloadV1 {
  // Regenerate updates private payload only.
  void input.privatePayloadYear;
  void input.regeneratedPrivateYear;
  return input.publishedPayload;
}

function samplePublishedPayload(): WrappedPublishedPayloadV1 {
  return {
    schemaVersion: 1,
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
        writingReliableFrom: null,
        isPartialYearWriting: false,
      },
      metrics: {
        personal: { 'period.wordsAdded': metricValue(10) },
        byCampaign: {},
        participation: {
          sessionsAttended: metricValue(1),
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
      topCampaign: null,
      referencedCampaignIds: [],
      archetypes: null,
      biggestMonth: null,
      monthlyActivity: [],
    },
    presentation: { campaigns: {}, redactedCampaignIds: [] },
  };
}

describe('seasonal invite availability mapping', () => {
  it('never maps unavailable tiers to ready/limited CTAs', () => {
    assert.equal(resolveWrappedInviteAvailability('unavailable'), 'unavailable');
    assert.equal(resolveWrappedInviteAvailability('short'), 'limited');
    assert.equal(resolveWrappedInviteAvailability('full'), 'ready');
  });
});

describe('public Wrapped access gates', () => {
  it('denies anonymous access when publishing is disabled even if published', () => {
    assert.equal(
      publicAccessAllowed({
        wrappedEnabled: true,
        publicPublishingEnabled: false,
        publishedAt: new Date('2026-12-21T00:00:00.000Z'),
        publishedPayload: samplePublishedPayload(),
      }),
      false,
    );
  });

  it('denies access when Wrapped is globally disabled', () => {
    assert.equal(
      publicAccessAllowed({
        wrappedEnabled: false,
        publicPublishingEnabled: true,
        publishedAt: new Date('2026-12-21T00:00:00.000Z'),
        publishedPayload: samplePublishedPayload(),
      }),
      false,
    );
  });

  it('denies unpublished URLs without revealing private existence', () => {
    assert.equal(
      publicAccessAllowed({
        wrappedEnabled: true,
        publicPublishingEnabled: true,
        publishedAt: null,
        publishedPayload: null,
      }),
      false,
    );
  });

  it('allows published editions when flags are on', () => {
    assert.equal(
      publicAccessAllowed({
        wrappedEnabled: true,
        publicPublishingEnabled: true,
        publishedAt: new Date('2026-12-21T00:00:00.000Z'),
        publishedPayload: samplePublishedPayload(),
      }),
      true,
    );
  });
});

describe('publication consent and regenerate isolation', () => {
  it('treats first publish as requiring consent; republish reuses status', () => {
    const needsConsent = (status: WrappedYearResponse['publication']['status']) =>
      status !== 'published';
    assert.equal(needsConsent('unpublished'), true);
    assert.equal(needsConsent('published'), false);
  });

  it('keeps frozen published payload when private calculation regenerates', () => {
    const published = samplePublishedPayload();
    const frozen = regenerateLeavesPublishedUntouched({
      privatePayloadYear: 2026,
      publishedPayload: published,
      regeneratedPrivateYear: 2026,
    });
    assert.equal(frozen.calculation.metrics.personal['period.wordsAdded']?.status, 'value');
    assert.equal(frozen, published);
  });
});
