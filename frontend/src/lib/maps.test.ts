import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapTitleFromFilename } from './maps.js';

describe('mapTitleFromFilename', () => {
  it('removes the extension and formats separators for display', () => {
    assert.equal(mapTitleFromFilename('western_reaches.png'), 'Western Reaches');
    assert.equal(mapTitleFromFilename('sunken-city.webp'), 'Sunken City');
  });

  it('formats camel case and preserves a usable fallback', () => {
    assert.equal(mapTitleFromFilename('frostVale.final.jpg'), 'Frost Vale.final');
    assert.equal(mapTitleFromFilename('.png'), 'Untitled map');
  });
});
