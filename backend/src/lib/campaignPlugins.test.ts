import test from 'node:test';
import assert from 'node:assert/strict';
import { PluginScopes } from './pluginManifest.js';
import { buildDefaultConfigFromTemplate } from './pluginManifest.js';

test('campaign plugin enable uses default config from manifest template', () => {
  const defaults = buildDefaultConfigFromTemplate([
    { key: 'moonName', label: 'Moon', type: 'text', defaultValue: 'Luna' },
  ]);
  assert.equal(defaults.moonName, 'Luna');
});

test('manifest scope literals distinguish global and campaign plugins', () => {
  assert.equal(PluginScopes.GLOBAL, 'global');
  assert.equal(PluginScopes.CAMPAIGN, 'campaign');
});
