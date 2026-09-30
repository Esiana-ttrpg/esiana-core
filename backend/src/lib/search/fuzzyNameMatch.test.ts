import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectFuzzyCandidates,
  fuzzyDistanceAllowance,
  matchFuzzyName,
  osaDistance,
} from './fuzzyNameMatch.js';

test('osaDistance handles identity, substitution, and transposition', () => {
  assert.equal(osaDistance('besaid', 'besaid'), 0);
  assert.equal(osaDistance('besaid', 'besiad'), 1); // transposition of a/i
  assert.equal(osaDistance('yuna', 'yunna'), 1);
  assert.equal(osaDistance('abc', 'xyz'), 3);
});

test('fuzzyDistanceAllowance gates short tokens', () => {
  assert.equal(fuzzyDistanceAllowance(3), 0);
  assert.equal(fuzzyDistanceAllowance(4), 1);
  assert.equal(fuzzyDistanceAllowance(7), 1);
  assert.equal(fuzzyDistanceAllowance(8), 2);
});

test('matchFuzzyName finds typo title and alias', () => {
  const title = matchFuzzyName(['besiad'], 'besaid village', '');
  assert.ok(title);
  assert.equal(title!.on, 'title');
  assert.ok(title!.similarity > 0.5);

  const alias = matchFuzzyName(['yunna'], 'summoner', 'yuna high summoner');
  assert.ok(alias);
  assert.equal(alias!.on, 'alias');
});

test('matchFuzzyName rejects tokens under 4 chars for fuzzy', () => {
  assert.equal(matchFuzzyName(['yun'], 'yuna', ''), null);
  assert.equal(matchFuzzyName(['ab'], 'abc', ''), null);
});

test('matchFuzzyName mixed short+long requires short to match strictly', () => {
  // "of" must appear in the name; "besiad" fuzzy-matches "besaid"
  const hit = matchFuzzyName(['of', 'besiad'], 'isle of besaid', '');
  assert.ok(hit);
  const miss = matchFuzzyName(['zz', 'besiad'], 'isle of besaid', '');
  assert.equal(miss, null);
});

test('prefix/contains length delta beyond allowance is not a match', () => {
  // token "besaid" (len 6, allowance 1) vs word "besaidxxxx" (len 10) — delta 4
  assert.equal(matchFuzzyName(['besaid'], 'besaidxxxx', ''), null);
  // Still matches near-length prefix
  assert.ok(matchFuzzyName(['besaid'], 'besaids', ''));
});

test('collectFuzzyCandidates ranks and respects exclude + forward cap', () => {
  const rows = [
    { sourceId: '1', titleNorm: 'besaid', aliasText: '' },
    { sourceId: '2', titleNorm: 'besiad isle', aliasText: '' },
    { sourceId: '3', titleNorm: 'yuna', aliasText: '' },
    { sourceId: '4', titleNorm: 'besaid village', aliasText: '' },
  ];
  const hits = collectFuzzyCandidates(['besiad'], rows, {
    excludeIds: new Set(['2']),
    forwardCap: 2,
  });
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => h.sourceId !== '2'));
  assert.ok(hits.every((h) => h.sourceId !== '3'));
  assert.ok(hits[0]!.similarity >= hits[1]!.similarity);
});
