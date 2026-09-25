import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { clearConnectionProviderRegistry, getConnectionProvider, registerConnectionProvider } from './connectionProviderRegistry.js';

afterEach(clearConnectionProviderRegistry);

test('connection provider id must match the registering plugin', () => {
  assert.throws(() => registerConnectionProvider('one', { id: 'two', displayName: 'Two', auth: { type: 'bearer' } }), /must match/);
});

test('API key providers reject credential-conflicting headers', () => {
  assert.throws(() => registerConnectionProvider('example', { id: 'example', displayName: 'Example', auth: { type: 'apiKey', headerName: 'Authorization' } }), /not allowed/);
});

test('providers default to both explicit ownership modes', () => {
  registerConnectionProvider('example', { id: 'example', displayName: 'Example', auth: { type: 'bearer' } });
  assert.deepEqual(getConnectionProvider('example')?.ownership, ['campaign', 'user']);
});
