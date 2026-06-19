import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectLocalRegistryFallback,
  mergeDiscoverablePluginEntries,
  readLocalPluginRegistryFromDisk,
} from './bundledPlugins.js';

test('readLocalPluginRegistryFromDisk loads community-plugins catalog in monorepo', (t) => {
  const result = readLocalPluginRegistryFromDisk();
  if (!result.ok) {
    t.skip('community-plugins registry not on disk');
    return;
  }
  assert.ok(result.plugins.some((entry) => entry.id === 'wiki-opds-feed'));
  assert.ok(result.plugins.some((entry) => entry.id === 'example-plugin'));
  assert.ok(result.plugins.some((entry) => entry.id === 'campaign-seeder'));
});

test('collectLocalRegistryFallback returns registry entries without bundled URL identity', () => {
  const fallback = collectLocalRegistryFallback();
  if (fallback.plugins.length === 0) {
    assert.ok(true, 'skip — community-plugins registry not on disk');
    return;
  }
  assert.ok(fallback.plugins.some((entry) => entry.id === 'demo-content-packs'));
  assert.ok(
    fallback.warnings.some((warning) => warning.includes('Remote registry unavailable')),
  );
});

test('mergeDiscoverablePluginEntries prefers later remote entry over earlier stub', () => {
  const remote = [
    {
      id: 'wiki-opds-feed',
      name: 'Wiki OPDS Feed',
      version: '0.1.0',
      description: 'Remote entry',
      scope: 'campaign' as const,
      installable: true,
      source: {
        type: 'github' as const,
        repo: 'Esiana-ttrpg/community-plugins',
        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        path: 'wiki-opds-feed',
      },
    },
  ];
  const stub = [
    {
      id: 'wiki-opds-feed',
      name: 'Wiki OPDS Feed',
      version: '0.0.1',
      description: 'Older stub',
      scope: 'campaign' as const,
      installable: false,
    },
  ];
  const merged = mergeDiscoverablePluginEntries(stub, remote);
  const opds = merged.find((entry) => entry.id === 'wiki-opds-feed');
  assert.equal(opds?.source?.type, 'github');
  assert.equal(opds?.installable, true);
});
