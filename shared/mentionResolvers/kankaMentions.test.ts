import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExternalEntityIndex,
  resolveExternalMentions,
} from './kankaMentions.js';

test('resolveExternalMentions rewrites Kanka tokens to wikilinks', () => {
  const index = buildExternalEntityIndex([
    { id: '6362082', name: 'Kane', folder: 'characters' },
    { id: '6359027', name: 'Elderhelm', folder: 'locations' },
  ]);
  const input = 'Led by [character:6362082] in [location:6359027].';
  const output = resolveExternalMentions(input, index);
  assert.match(output, /\[\[Kane\]\]/);
  assert.match(output, /\[\[Elderhelm\]\]/);
});

test('resolveExternalMentions leaves unknown ids unchanged', () => {
  const index = buildExternalEntityIndex([]);
  assert.equal(resolveExternalMentions('[character:999]', index), '[character:999]');
});
