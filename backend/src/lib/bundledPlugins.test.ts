import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listBundledCampaignPluginEntries,
  listBundledGlobalPluginEntries,
  mergeDiscoverablePluginEntries,
  readLocalPluginRegistryFromDisk,
} from './bundledPlugins.js';
import { isRegistryEntryInstallable } from './pluginManifest.js';

test('readLocalPluginRegistryFromDisk loads community-plugins catalog in monorepo', () => {
  const result = readLocalPluginRegistryFromDisk();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.plugins.some((entry) => entry.id === 'wiki-opds-feed'));
  assert.ok(result.plugins.some((entry) => entry.id === 'example-plugin'));
  assert.ok(result.plugins.some((entry) => entry.id === 'campaign-seeder'));
});

test('listBundledGlobalPluginEntries includes linked global generators on disk', () => {
  const entries = listBundledGlobalPluginEntries();
  const seeder = entries.find((entry) => entry.id === 'campaign-seeder');
  if (!seeder) {
    assert.ok(true, 'skip — run npm run plugins:link for on-disk bundled plugins');
    return;
  }
  assert.equal(seeder.scope, 'global');
  assert.equal(seeder.source?.type, 'bundled');
  assert.equal(isRegistryEntryInstallable(seeder), true);
});

test('listBundledCampaignPluginEntries includes linked campaign plugins on disk', () => {
  const entries = listBundledCampaignPluginEntries();
  const opds = entries.find((entry) => entry.id === 'wiki-opds-feed');
  if (!opds) {
    assert.ok(true, 'skip — run npm run plugins:link for on-disk bundled plugins');
    return;
  }
  assert.equal(opds.scope, 'campaign');
  assert.equal(opds.source?.type, 'bundled');
  assert.equal(isRegistryEntryInstallable(opds), true);
});

test('mergeDiscoverablePluginEntries prefers bundled source over remote stub', () => {
  const bundled = listBundledCampaignPluginEntries();
  const remote = [
    {
      id: 'wiki-opds-feed',
      name: 'Wiki OPDS Feed',
      version: '0.0.1',
      description: 'Remote stub',
      scope: 'campaign' as const,
      installable: false,
    },
  ];
  const merged = mergeDiscoverablePluginEntries(bundled, remote);
  const opds = merged.find((entry) => entry.id === 'wiki-opds-feed');
  if (bundled.some((entry) => entry.id === 'wiki-opds-feed')) {
    assert.equal(opds?.source?.type, 'bundled');
  } else {
    assert.equal(opds?.installable, false);
  }
});
