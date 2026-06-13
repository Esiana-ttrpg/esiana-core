import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AssetReferenceError,
  coerceAssetReferenceUrl,
  isAssetReferenceUrl,
  normalizeAssetReferenceUrl,
  parseAssetReferenceId,
} from '../../../shared/assetReferenceValidation.js';

test('parseAssetReferenceId extracts id from canonical reference', () => {
  assert.equal(parseAssetReferenceId('/api/assets/clxyz123'), 'clxyz123');
});

test('isAssetReferenceUrl accepts only /api/assets/{id}', () => {
  assert.equal(isAssetReferenceUrl('/api/assets/abc'), true);
  assert.equal(isAssetReferenceUrl('https://example.com/x.png'), false);
  assert.equal(isAssetReferenceUrl('/uploads/foo.webp'), false);
});

test('coerceAssetReferenceUrl returns null for invalid values', () => {
  assert.equal(coerceAssetReferenceUrl(null), null);
  assert.equal(coerceAssetReferenceUrl(''), null);
  assert.equal(coerceAssetReferenceUrl('https://example.com/x.png'), null);
  assert.equal(coerceAssetReferenceUrl('/uploads/foo.webp'), null);
  assert.equal(coerceAssetReferenceUrl('/api/assets/id1'), '/api/assets/id1');
});

test('normalizeAssetReferenceUrl throws on invalid non-empty values', () => {
  assert.throws(
    () => normalizeAssetReferenceUrl('https://example.com/x.png'),
    AssetReferenceError,
  );
  assert.throws(
    () => normalizeAssetReferenceUrl('/uploads/foo.webp'),
    AssetReferenceError,
  );
  assert.equal(normalizeAssetReferenceUrl(''), null);
  assert.equal(normalizeAssetReferenceUrl('/api/assets/id1'), '/api/assets/id1');
});
