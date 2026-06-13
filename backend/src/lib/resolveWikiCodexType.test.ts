import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';

describe('resolveWikiCodexType', () => {
  it('keeps explicit template types', () => {
    assert.equal(
      resolveWikiCodexType({ templateType: 'LOCATION' }),
      'LOCATION',
    );
  });

  it('resolves quests from metadata category', () => {
    assert.equal(
      resolveWikiCodexType({
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'quests' },
      }),
      'QUEST',
    );
  });

  it('resolves quests from quest fields', () => {
    assert.equal(
      resolveWikiCodexType({
        templateType: 'DEFAULT',
        metadata: { questStatus: 'ACTIVE' },
      }),
      'QUEST',
    );
  });

  it('returns DEFAULT when unknown', () => {
    assert.equal(
      resolveWikiCodexType({ templateType: 'DEFAULT', metadata: {} }),
      'DEFAULT',
    );
  });
});
