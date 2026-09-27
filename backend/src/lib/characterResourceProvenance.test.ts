import assert from 'node:assert/strict';
import test from 'node:test';
import {
  characterResourceProvenance,
  isUserDeletableCharacterResource,
} from './characterResourceProvenance.js';

test('API authentication assigns API provenance and retains token identity', () => {
  assert.deepEqual(characterResourceProvenance({
    authMethod: 'apiToken',
    apiTokenId: 'token-123',
    apiTokenName: 'Campaign Sync',
  }), {
    origin: 'API',
    apiSourceId: 'token-123',
    apiSourceName: 'Campaign Sync',
  });
});

test('request input cannot forge core or plugin provenance', () => {
  const forged = {
    authMethod: 'apiToken' as const,
    apiTokenId: 'token-123',
    apiTokenName: 'Campaign Sync',
    body: { origin: 'PLUGIN', pluginId: 'trusted-plugin' },
    origin: 'CORE',
  };
  assert.equal(characterResourceProvenance(forged).origin, 'API');
  assert.equal(characterResourceProvenance({
    ...forged,
    authMethod: 'session',
  }).origin, 'CUSTOM');
});

test('API resources follow normal deletion rules while provider resources remain protected', () => {
  assert.equal(isUserDeletableCharacterResource('CUSTOM'), true);
  assert.equal(isUserDeletableCharacterResource('API'), true);
  assert.equal(isUserDeletableCharacterResource('PLUGIN'), false);
  assert.equal(isUserDeletableCharacterResource('CORE'), false);
});
