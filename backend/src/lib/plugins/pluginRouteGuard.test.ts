import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLOCKED_ROUTE_PREFIXES,
  validatePluginRoutePath,
} from './pluginRouteGuard.js';

test('BLOCKED_ROUTE_PREFIXES includes infra paths', () => {
  assert.ok(BLOCKED_ROUTE_PREFIXES.includes('/api/plugins'));
  assert.ok(BLOCKED_ROUTE_PREFIXES.includes('/api/plugin-runtime'));
  assert.ok(BLOCKED_ROUTE_PREFIXES.includes('/api/auth'));
});

test('validatePluginRoutePath rejects path traversal', () => {
  assert.throws(
    () => validatePluginRoutePath('demo', '../secret'),
    /\.\./,
  );
});

test('validatePluginRoutePath rejects absolute api paths', () => {
  assert.throws(
    () => validatePluginRoutePath('demo', '/api/admin/users'),
    /absolute API path/,
  );
});

test('validatePluginRoutePath allows relative plugin paths', () => {
  assert.doesNotThrow(() => validatePluginRoutePath('demo', '/hello'));
  assert.doesNotThrow(() => validatePluginRoutePath('demo', 'feed/catalog'));
});
