import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseApiTokenScopes,
  isLegacyApiToken,
  tokenGrantsAllScopes,
  tokenGrantsScope,
} from './apiToken.js';

test('parseApiTokenScopes accepts known scopes and rejects unknown', () => {
  assert.deepEqual(parseApiTokenScopes(['campaign:read', 'plugins:read']), [
    'campaign:read',
    'plugins:read',
  ]);
  assert.equal(parseApiTokenScopes(['unknown:scope']), null);
});

test('isLegacyApiToken identifies empty scopes', () => {
  assert.equal(isLegacyApiToken([]), true);
  assert.equal(isLegacyApiToken(['campaign:read']), false);
});

test('empty token scopes grant legacy full access', () => {
  assert.equal(tokenGrantsScope([], 'plugins:manage'), true);
  assert.equal(tokenGrantsAllScopes([], ['campaign:read', 'plugins:read']), true);
});

test('scoped tokens require explicit grants', () => {
  const scopes = ['campaign:read'];
  assert.equal(tokenGrantsScope(scopes, 'campaign:read'), true);
  assert.equal(tokenGrantsScope(scopes, 'plugins:manage'), false);
  assert.equal(tokenGrantsAllScopes(scopes, ['campaign:read']), true);
  assert.equal(tokenGrantsAllScopes(scopes, ['campaign:read', 'plugins:read']), false);
});
