import test from 'node:test';
import assert from 'node:assert/strict';
import { isPasswordAuthEnabled } from './passwordAuth.js';

test('isPasswordAuthEnabled is true when passwordHash is set', () => {
  assert.equal(isPasswordAuthEnabled({ passwordHash: 'hashed' }), true);
});

test('isPasswordAuthEnabled is false when passwordHash is null or empty', () => {
  assert.equal(isPasswordAuthEnabled({ passwordHash: null }), false);
  assert.equal(isPasswordAuthEnabled({ passwordHash: '' }), false);
  assert.equal(isPasswordAuthEnabled({}), false);
});
