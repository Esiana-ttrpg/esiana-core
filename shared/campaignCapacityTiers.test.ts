import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCampaignTier,
  recommendedDeploymentForTier,
  tierLabel,
  type CampaignSizeSnapshot,
} from './campaignCapacityTiers.js';

function snapshot(partial: Partial<CampaignSizeSnapshot>): CampaignSizeSnapshot {
  return {
    pageCount: 0,
    characterCount: 0,
    locationCount: 0,
    organizationCount: 0,
    sessionCount: 0,
    mapCount: 0,
    assetCount: 0,
    assetStorageBytes: 0,
    ...partial,
  };
}

describe('campaignCapacityTiers', () => {
  it('classifies empty campaign as small with comfortable headroom', () => {
    const result = classifyCampaignTier(snapshot({}));
    assert.equal(result.tier, 'small');
    assert.equal(result.headroom, 'comfortable');
    assert.equal(result.nextTier, 'medium');
  });

  it('classifies at small tier boundaries as approaching medium', () => {
    const result = classifyCampaignTier(
      snapshot({
        pageCount: 90,
        characterCount: 45,
        locationCount: 22,
        organizationCount: 9,
        sessionCount: 22,
        mapCount: 2,
      }),
    );
    assert.equal(result.tier, 'small');
    assert.equal(result.headroom, 'approaching');
  });

  it('classifies above small thresholds as medium', () => {
    const result = classifyCampaignTier(
      snapshot({
        pageCount: 150,
        characterCount: 60,
        locationCount: 30,
        organizationCount: 12,
        sessionCount: 30,
        mapCount: 3,
      }),
    );
    assert.equal(result.tier, 'medium');
  });

  it('classifies above large thresholds as large with exceeds headroom', () => {
    const result = classifyCampaignTier(
      snapshot({
        pageCount: 6000,
        characterCount: 1100,
        locationCount: 520,
        organizationCount: 210,
        sessionCount: 520,
        mapCount: 55,
      }),
    );
    assert.equal(result.tier, 'large');
    assert.equal(result.headroom, 'exceeds');
    assert.equal(result.nextTier, null);
  });

  it('preserves asset fields without affecting v1 classification', () => {
    const result = classifyCampaignTier(
      snapshot({
        pageCount: 10,
        assetCount: 500,
        assetStorageBytes: 4_000_000_000,
      }),
    );
    assert.equal(result.tier, 'small');
  });

  it('returns deployment guidance per tier', () => {
    assert.match(recommendedDeploymentForTier('medium').database, /PostgreSQL/i);
    assert.equal(tierLabel('medium'), 'Medium Campaign');
  });
});
