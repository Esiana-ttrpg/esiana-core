import assert from 'node:assert/strict';
import test from 'node:test';
import { registrySyncWarnings, type PluginRegistryResponse } from './adminPlugins';

function response(overrides: Partial<PluginRegistryResponse>): PluginRegistryResponse {
  return {
    registryUrl: 'https://example.com/registry.json',
    plugins: [],
    remoteLoaded: false,
    ...overrides,
  };
}

test('failed registry loads do not also report a successfully loaded empty registry', () => {
  const warnings = registrySyncWarnings(
    response({ warnings: ['Remote registry unavailable: invalid response'] }),
  );
  assert.deepEqual(warnings, ['Remote registry unavailable: invalid response']);
});

test('successfully parsed empty registries report that they contain no entries', () => {
  const warnings = registrySyncWarnings(response({ remoteLoaded: true }));
  assert.deepEqual(warnings, ['Registry loaded but contains no plugin entries.']);
});
