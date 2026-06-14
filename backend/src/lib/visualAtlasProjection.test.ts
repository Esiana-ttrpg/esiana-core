import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildVisualAtlasProjection,
  classifyVisualAtlasFilter,
  collectImageDisplayBlocks,
  readPortraitCredit,
} from './visualAtlasProjection.js';

describe('classifyVisualAtlasFilter', () => {
  it('maps character template type to characters filter', () => {
    assert.equal(
      classifyVisualAtlasFilter({
        templateType: 'CHARACTER',
        metadata: {},
      }),
      'characters',
    );
  });

  it('maps organization template type to organizations filter', () => {
    assert.equal(
      classifyVisualAtlasFilter({
        templateType: 'ORGANIZATION',
        metadata: {},
      }),
      'organizations',
    );
  });

  it('maps rules-resources entity category to resources filter', () => {
    assert.equal(
      classifyVisualAtlasFilter({
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'rules-resources' },
      }),
      'resources',
    );
  });

  it('returns null for unrelated pages', () => {
    assert.equal(
      classifyVisualAtlasFilter({
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'families' },
      }),
      null,
    );
  });
});

describe('readPortraitCredit', () => {
  it('reads portrait credit from appearance metadata', () => {
    const credit = readPortraitCredit({
      appearance: {
        portraitUrl: 'https://example.com/p.png',
        portraitCredit: { madeWith: 'HeroForge' },
      },
    });
    assert.equal(credit?.madeWith, 'HeroForge');
  });
});

describe('collectImageDisplayBlocks', () => {
  it('includes image credit from image-display blocks', () => {
    const blocks = collectImageDisplayBlocks(
      [
        {
          type: 'image-display',
          content: {
            imageUrl: '/api/assets/test-art-id',
            imageCredit: { artCredit: 'Jane Doe', sourceUrl: 'https://ignored.test' },
          },
        },
      ],
      'GAMEMASTER',
    );
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.imageCredit?.artCredit, 'Jane Doe');
    assert.equal(blocks[0]?.imageCredit?.sourceUrl, null);
  });
});

describe('buildVisualAtlasProjection', () => {
  it('exports a projection builder function', () => {
    assert.equal(typeof buildVisualAtlasProjection, 'function');
  });
});
