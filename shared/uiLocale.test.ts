import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isShippedUiLocale,
  resolveEffectiveUiLocale,
  resolveInstanceDefaultUiLocale,
  sanitizeUiLocale,
} from './uiLocale.js';

test('sanitizeUiLocale accepts BCP 47 tags', () => {
  assert.equal(sanitizeUiLocale('fr-CA'), 'fr-CA');
  assert.equal(sanitizeUiLocale(''), null);
});

test('resolveInstanceDefaultUiLocale requires shipped locale', () => {
  assert.equal(resolveInstanceDefaultUiLocale('fr'), 'fr');
  assert.equal(resolveInstanceDefaultUiLocale('de'), null);
});

test('resolveEffectiveUiLocale prefers user over instance default', () => {
  assert.equal(
    resolveEffectiveUiLocale({
      userUiLocale: 'en',
      instanceDefaultLocale: 'fr',
      browserLanguage: 'fr',
    }),
    'en',
  );
});

test('resolveEffectiveUiLocale uses instance default before browser', () => {
  assert.equal(
    resolveEffectiveUiLocale({
      userUiLocale: null,
      instanceDefaultLocale: 'fr',
      browserLanguage: 'en-US',
    }),
    'fr',
  );
});

test('isShippedUiLocale includes community locales', () => {
  assert.equal(isShippedUiLocale('fr'), true);
  assert.equal(isShippedUiLocale('de'), false);
});
