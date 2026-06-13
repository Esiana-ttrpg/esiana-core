import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasImageCredit,
  imageCreditDisplayRows,
  normalizeImageCredit,
} from '../../../shared/imageCredit.js';

describe('normalizeImageCredit', () => {
  it('returns null for empty object', () => {
    assert.equal(normalizeImageCredit({}), null);
  });

  it('drops URL-only fields without primary text', () => {
    assert.equal(
      normalizeImageCredit({
        artCreditUrl: 'https://example.com/artist',
        sourceUrl: 'https://artstation.com/work',
      }),
      null,
    );
  });

  it('keeps valid credit with https URLs', () => {
    const credit = normalizeImageCredit({
      artCredit: 'Jane Doe',
      artCreditUrl: 'https://example.com/jane',
      madeWith: 'HeroForge',
    });
    assert.deepEqual(credit, {
      artCredit: 'Jane Doe',
      artCreditUrl: 'https://example.com/jane',
      source: null,
      sourceUrl: null,
      madeWith: 'HeroForge',
      madeWithUrl: null,
    });
  });

  it('strips invalid URLs', () => {
    const credit = normalizeImageCredit({
      source: 'ArtStation',
      sourceUrl: 'not-a-url',
    });
    assert.deepEqual(credit, {
      artCredit: null,
      artCreditUrl: null,
      source: 'ArtStation',
      sourceUrl: null,
      madeWith: null,
      madeWithUrl: null,
    });
  });
});

describe('imageCreditDisplayRows', () => {
  it('omits empty fields and never returns blank rows', () => {
    const rows = imageCreditDisplayRows({
      artCredit: 'Jane Doe',
      source: '',
      madeWith: '  ',
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.label, 'Art credit');
    assert.equal(rows[0]?.text, 'Jane Doe');
  });

  it('returns zero rows for URL-only credit', () => {
    assert.deepEqual(
      imageCreditDisplayRows({
        artCreditUrl: 'https://example.com',
      }),
      [],
    );
  });
});

describe('hasImageCredit', () => {
  it('matches whether display rows exist', () => {
    assert.equal(hasImageCredit({ artCredit: 'A' }), true);
    assert.equal(hasImageCredit({ artCreditUrl: 'https://x.test' }), false);
    assert.equal(hasImageCredit(null), false);
  });
});
