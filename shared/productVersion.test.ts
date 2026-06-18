import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProductVersion,
  readVersionFromPackageJson,
} from './productVersion.js';

test('normalizeProductVersion strips leading v and whitespace', () => {
  assert.equal(normalizeProductVersion('  v1.0.8  '), '1.0.8');
  assert.equal(normalizeProductVersion(''), '0.0.0');
});

test('readVersionFromPackageJson requires esiana root package', () => {
  assert.equal(
    readVersionFromPackageJson({ name: 'esiana', version: '1.1.0' }),
    '1.1.0',
  );
  assert.equal(
    readVersionFromPackageJson({ name: 'other', version: '9.9.9' }),
    '0.0.0',
  );
  assert.equal(readVersionFromPackageJson({ name: 'esiana' }), '0.0.0');
});
