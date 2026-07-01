import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';

describe('resolveWikiCodexType', () => {
  it('resolves entity category from metadata', () => {
    assert.equal(
      resolveWikiCodexType({
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'locations' },
      }),
      'LOCATION',
    );
  });

  it('returns DEFAULT for generic pages', () => {
    assert.equal(
      resolveWikiCodexType({ templateType: 'DEFAULT', metadata: {} }),
      'DEFAULT',
    );
  });

  it('passes through structural template types', () => {
    assert.equal(resolveWikiCodexType({ templateType: 'QUEST' }), 'QUEST');
    assert.equal(resolveWikiCodexType({ templateType: 'SCENE' }), 'SCENE');
  });

  it('infers quest from metadata signals', () => {
    assert.equal(
      resolveWikiCodexType({
        templateType: 'DEFAULT',
        metadata: { questStatus: 'ACTIVE' },
      }),
      'QUEST',
    );
  });
});
