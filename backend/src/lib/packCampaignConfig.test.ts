import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePackCampaignConfig } from './packCampaignConfig.js';

describe('parsePackCampaignConfig', () => {
  it('parses coverImagePath', () => {
    const config = parsePackCampaignConfig({
      formatVersion: 1,
      coverImagePath: 'assets/banner.webp',
    });
    assert.ok(config);
    assert.equal(config.coverImagePath, 'assets/banner.webp');
  });

  it('trims coverImagePath', () => {
    const config = parsePackCampaignConfig({
      formatVersion: 1,
      coverImagePath: '  banner.webp  ',
    });
    assert.ok(config);
    assert.equal(config.coverImagePath, 'banner.webp');
  });
});
