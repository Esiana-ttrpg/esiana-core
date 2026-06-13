import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getClaimByPath,
  normalizeGroupsClaimValue,
  normalizeEmail,
} from './oidcClaims.js';

test('getClaimByPath reads nested claims', () => {
  const claims = { realm_access: { roles: ['dm', 'player'] } };
  assert.deepEqual(getClaimByPath(claims, 'realm_access.roles'), ['dm', 'player']);
});

test('normalizeGroupsClaimValue accepts arrays and strings', () => {
  assert.deepEqual(normalizeGroupsClaimValue(['a', 'b']), ['a', 'b']);
  assert.deepEqual(normalizeGroupsClaimValue('admins,users'), ['admins', 'users']);
  assert.deepEqual(normalizeGroupsClaimValue('solo'), ['solo']);
});

test('normalizeEmail lowercases valid emails', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  assert.equal(normalizeEmail(null), null);
});
