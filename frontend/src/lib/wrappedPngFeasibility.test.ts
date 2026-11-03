import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRemoteCampaignArtworkUrl,
  shareSafeArtworkUrl,
  WRAPPED_EXPORT_HEIGHT,
  WRAPPED_EXPORT_WIDTH,
} from './wrappedPngFeasibility.ts';

describe('wrapped PNG feasibility guards', () => {
  it('exports at 1080x1920', () => {
    assert.equal(WRAPPED_EXPORT_WIDTH, 1080);
    assert.equal(WRAPPED_EXPORT_HEIGHT, 1920);
  });

  it('treats absolute http(s) artwork as unsafe for export', () => {
    assert.equal(isRemoteCampaignArtworkUrl('https://cdn.example.com/cover.jpg'), true);
    assert.equal(isRemoteCampaignArtworkUrl('http://cdn.example.com/cover.jpg'), true);
  });

  it('never returns artwork for unauthorized campaigns', () => {
    assert.equal(
      shareSafeArtworkUrl('https://cdn.example.com/x.jpg', false),
      null,
    );
    assert.equal(shareSafeArtworkUrl(null, true), null);
  });
});
