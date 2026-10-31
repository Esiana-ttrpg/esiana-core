import assert from 'node:assert/strict';
import { it } from 'node:test';
import { slugifyTagName } from './tagUtils.js';
import { slugifyTagName as clientSlug } from '../../../frontend/src/lib/tagUtils.js';
import { normalizeAlias } from './normalizeAlias.js';
import { normalizeAlias as clientAlias } from '../../../frontend/src/lib/normalizeAlias.js';

it('keeps client and server canonical tag and alias identifiers compatible', () => {
  for (const [input, expected] of [
    ['', ''], [' \t ', ''], ['Mira/Ash', 'mira-ash'],
    ['MiraAsh', 'miraash'], [' Éowyn’s 北 Archive ', 'owyn-s-archive'],
    ['Mira' + '-'.repeat(100_000), 'mira'],
  ]) {
    assert.equal(slugifyTagName(input), expected);
    assert.equal(clientSlug(input), expected);
    assert.equal(slugifyTagName(expected), expected);
    assert.equal(clientAlias(input), normalizeAlias(input));
  }
});
