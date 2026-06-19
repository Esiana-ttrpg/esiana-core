import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePluginManifest } from './pluginManifest.js';

test('validatePluginManifest accepts optional compatibility.lastVerifiedCore', () => {
  const result = validatePluginManifest({
    id: 'demo-plugin',
    name: 'Demo Plugin',
    version: '1.0.0',
    description: 'Test plugin',
    scope: 'global',
    engines: { 'esiana-core': '^1.0.0' },
    compatibility: { lastVerifiedCore: '0.9.0' },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.manifest.compatibility?.lastVerifiedCore, '0.9.0');
});

test('validatePluginManifest rejects invalid compatibility.lastVerifiedCore', () => {
  const result = validatePluginManifest({
    id: 'demo-plugin',
    name: 'Demo Plugin',
    version: '1.0.0',
    description: 'Test plugin',
    scope: 'global',
    compatibility: { lastVerifiedCore: 'not-a-version' },
  });

  assert.equal(result.ok, false);
});
