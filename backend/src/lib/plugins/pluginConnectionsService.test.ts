import assert from 'node:assert/strict';
import test from 'node:test';
import type { PluginConnection } from '@prisma/client';
import { isTerminalOAuthRefreshFailure, redactConnection } from './pluginConnectionsService.js';

test('redacted connection metadata never includes encrypted or raw credentials', () => {
  const row = {
    pluginId: 'provider',
    authType: 'oauth2', status: 'connected', credentialEnc: 'encrypted-secret-payload', credentialVersion: 1, accountLabel: 'Library account',
    scopes: ['library.read'], expiresAt: new Date('2030-01-01T00:00:00Z'), lastError: null,
    createdAt: new Date('2029-01-01T00:00:00Z'), updatedAt: new Date('2029-01-02T00:00:00Z'),
  } satisfies PluginConnection;
  const redacted = redactConnection(row);
  assert.equal('credentialEnc' in redacted, false);
  assert.doesNotMatch(JSON.stringify(redacted), /encrypted-secret-payload/);
});

test('only invalid_grant requires reconnect; provider outages stay retryable', () => {
  assert.equal(isTerminalOAuthRefreshFailure(400, 'invalid_grant'), true);
  assert.equal(isTerminalOAuthRefreshFailure(500, 'server_error'), false);
  assert.equal(isTerminalOAuthRefreshFailure(503, undefined), false);
  assert.equal(isTerminalOAuthRefreshFailure(429, 'temporarily_unavailable'), false);
});
