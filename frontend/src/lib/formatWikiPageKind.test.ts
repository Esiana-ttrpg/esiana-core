import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatWikiPageKind } from './formatWikiPageKind.ts';

describe('formatWikiPageKind', () => {
  it('maps known page kinds', () => {
    assert.equal(formatWikiPageKind('CHARACTER'), 'Character');
    assert.equal(formatWikiPageKind('LOCATION'), 'Location');
    assert.equal(formatWikiPageKind('QUEST'), 'Quest');
    assert.equal(formatWikiPageKind('SCENE'), 'Scene');
  });

  it('falls back for empty values', () => {
    assert.equal(formatWikiPageKind(null), 'Page');
    assert.equal(formatWikiPageKind(''), 'Page');
  });

  it('title-cases unknown snake_case kinds', () => {
    assert.equal(formatWikiPageKind('CUSTOM_TYPE'), 'Custom Type');
  });
});
