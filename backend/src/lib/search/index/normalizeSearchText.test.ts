import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSearchText,
  normalizeSearchTokens,
} from './normalizeSearchText.js';

test('normalizeSearchText lowercases and collapses whitespace', () => {
  assert.equal(normalizeSearchText('  Hello   World  '), 'hello world');
});

test('normalizeSearchText strips diacritics via NFKD', () => {
  assert.equal(normalizeSearchText('Café'), 'cafe');
  assert.equal(normalizeSearchText(' naïve '), 'naive');
});

test('normalizeSearchText folds punctuation to spaces', () => {
  assert.equal(normalizeSearchText('foo,bar!baz'), 'foo bar baz');
  assert.equal(normalizeSearchText("O'Brien"), "o'brien");
  assert.equal(normalizeSearchText('well-known'), 'well-known');
});

test('normalizeSearchText handles null/empty', () => {
  assert.equal(normalizeSearchText(null), '');
  assert.equal(normalizeSearchText(undefined), '');
  assert.equal(normalizeSearchText(''), '');
});

test('normalizeSearchTokens dedupes and splits', () => {
  assert.deepEqual(normalizeSearchTokens(['Café', 'cafe', 'Hello,World']), [
    'cafe',
    'hello',
    'world',
  ]);
});
