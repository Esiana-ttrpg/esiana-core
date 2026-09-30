import assert from 'node:assert/strict';
import test from 'node:test';
import { characterFieldValueToSearchText } from './searchFieldValue.js';
import {
  buildCandidateLikePattern,
  pickPrefilterToken,
} from './searchCandidateSql.js';

test('characterFieldValueToSearchText projects scalars for CAST discoverability', () => {
  assert.equal(characterFieldValueToSearchText('STRING', 'Besaid'), 'Besaid');
  assert.equal(characterFieldValueToSearchText('ENUM', 'Summoner'), 'Summoner');
  assert.equal(characterFieldValueToSearchText('DATE', '2026-01-01'), '2026-01-01');
  assert.equal(characterFieldValueToSearchText('NUMBER', 42), '42');
  assert.equal(characterFieldValueToSearchText('BOOLEAN', true), 'true');
  assert.equal(characterFieldValueToSearchText('BOOLEAN', false), 'false');
  assert.equal(characterFieldValueToSearchText('JSON', { a: 1 }), null);
  assert.equal(characterFieldValueToSearchText('STRING', ''), null);
  assert.equal(characterFieldValueToSearchText('STRING', null), null);
});

test('buildCandidateLikePattern escapes wildcards and widens non-ASCII', () => {
  assert.equal(buildCandidateLikePattern('besaid'), '%besaid%');
  assert.equal(buildCandidateLikePattern('100%'), '%100\\%%');
  assert.equal(buildCandidateLikePattern('a_b'), '%a\\_b%');
  // Non-ASCII letter becomes single-char wildcard so SQLite LOWER cannot miss.
  const pattern = buildCandidateLikePattern('café');
  assert.ok(pattern.startsWith('%'));
  assert.ok(pattern.endsWith('%'));
  assert.match(pattern, /caf_/);
});

test('pickPrefilterToken chooses the longest token', () => {
  assert.equal(pickPrefilterToken(['a', 'besaid', 'of']), 'besaid');
  assert.equal(pickPrefilterToken([]), null);
});
