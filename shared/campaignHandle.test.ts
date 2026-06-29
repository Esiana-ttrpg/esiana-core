import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCampaignHandleFromName,
  getCampaignNameHandleError,
  normalizeCampaignHandleSeed,
} from './campaignHandle.js';

describe('campaignHandle', () => {
  it('normalizes display names into handle seeds', () => {
    assert.equal(normalizeCampaignHandleSeed('My Campaign'), 'my-campaign');
    assert.equal(normalizeCampaignHandleSeed('  Shards!!! '), 'shards');
  });

  it('rejects names that cannot produce a 3+ character handle', () => {
    assert.equal(
      getCampaignNameHandleError('AB'),
      'Campaign name must contain at least 3 alphanumeric characters',
    );
    assert.equal(getCampaignNameHandleError('!!!'), getCampaignNameHandleError('AB'));
    assert.equal(getCampaignNameHandleError('   '), 'Campaign name is required');
  });

  it('accepts names that produce valid handles', () => {
    assert.equal(getCampaignNameHandleError('blank'), null);
    assert.equal(getCampaignNameHandleError('Test Campaign'), null);
    assert.equal(buildCampaignHandleFromName('Test Campaign'), 'test-campaign');
  });
});
