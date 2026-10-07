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

  it('capitalizes Unicode words only at the title start or after whitespace', () => {
    assert.equal(mapTitleFromFilename('élven_reaches.png'), 'Élven Reaches');
    assert.equal(mapTitleFromFilename('archive.final.png'), 'Archive.final');
    assert.equal(mapTitleFromFilename("queen's-road.png"), "Queen's Road");
  });
});
