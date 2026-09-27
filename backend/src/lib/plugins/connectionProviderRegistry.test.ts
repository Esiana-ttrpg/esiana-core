import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { clearConnectionProviderRegistry, getConnectionProvider, registerConnectionProvider } from './connectionProviderRegistry.js';

afterEach(clearConnectionProviderRegistry);

test('connection provider id must match the registering plugin', () => {
  assert.throws(() => registerConnectionProvider('one', { id: 'two', displayName: 'Two', resourceOrigins: ['https://api.example.com'], auth: { type: 'bearer' } }, ['https://api.example.com']), /must match/);
});

test('API key providers reject credential-conflicting headers', () => {
  assert.throws(() => registerConnectionProvider('example', { id: 'example', displayName: 'Example', resourceOrigins: ['https://api.example.com'], auth: { type: 'apiKey', headerName: 'Authorization' } }, ['https://api.example.com']), /not allowed/);
});

test('providers have no per-user or per-campaign ownership modes', () => {
  registerConnectionProvider('example', { id: 'example', displayName: 'Example', resourceOrigins: ['https://api.example.com'], auth: { type: 'bearer' } }, ['https://api.example.com']);
  assert.equal('ownership' in getConnectionProvider('example')!, false);
});

test('resource origins must be explicitly declared by the manifest', () => {
  assert.throws(() => registerConnectionProvider('example', { id: 'example', displayName: 'Example', resourceOrigins: ['https://other.example.com'], auth: { type: 'bearer' } }, ['https://api.example.com']), /subset/);
});
