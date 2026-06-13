import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBackendOnlyGlobalPlugin,
  isDataOnlyContentPackPlugin,
  PluginCapabilities,
  PluginScopes,
} from './pluginManifest.js';
import {
  installPluginFromRegistryEntry,
  resolveLocalPluginSourceDir,
} from './pluginInstaller.js';
import { readLocalPluginRegistryFromDisk } from './bundledPlugins.js';

test('isBackendOnlyGlobalPlugin accepts developmentProvider without frontendEntry', () => {
  assert.equal(
    isBackendOnlyGlobalPlugin({
      scope: PluginScopes.GLOBAL,
      capabilities: [PluginCapabilities.DEVELOPMENT_PROVIDER],
    }),
    true,
  );
});

test('isBackendOnlyGlobalPlugin rejects campaign scope without frontend', () => {
  assert.equal(
    isBackendOnlyGlobalPlugin({
      scope: PluginScopes.CAMPAIGN,
      capabilities: [PluginCapabilities.DEVELOPMENT_PROVIDER],
    }),
    false,
  );
});

const VALID_SHA = 'abcdef0123456789abcdef0123456789abcdef01';

const globalEntry = {
  id: 'test-global-plugin',
  name: 'Test Global',
  version: '1.0.0',
  description: 'Global plugin entry',
  scope: 'global' as const,
  source: {
    type: 'github' as const,
    repo: 'org/repo',
    commitSha: VALID_SHA,
    path: 'plugins/test-global-plugin',
  },
};

const campaignEntry = {
  id: 'test-campaign-plugin',
  name: 'Test Campaign',
  version: '1.0.0',
  description: 'Campaign plugin entry',
  scope: 'campaign' as const,
  source: {
    type: 'github' as const,
    repo: 'org/repo',
    commitSha: VALID_SHA,
    path: 'plugins/test-campaign-plugin',
  },
};

test('installPluginFromRegistryEntry accepts both global and campaign scope entries', async () => {
  await assert.rejects(
    () => installPluginFromRegistryEntry(globalEntry),
    /Plugin path|Download failed|not found|Unexpected archive/,
  );
  await assert.rejects(
    () => installPluginFromRegistryEntry(campaignEntry),
    /Plugin path|Download failed|not found|Unexpected archive/,
  );
});

test('isDataOnlyContentPackPlugin accepts markdown-only content pack manifests', () => {
  assert.equal(
    isDataOnlyContentPackPlugin({
      scope: PluginScopes.GLOBAL,
      capabilities: [PluginCapabilities.CONTENT_PACK],
    }),
    true,
  );
});

test('resolveLocalPluginSourceDir finds demo-content-packs in monorepo', () => {
  const registry = readLocalPluginRegistryFromDisk();
  if (!registry.ok) {
    assert.ok(true, 'skip — community-plugins registry not on disk');
    return;
  }
  const entry = registry.plugins.find((plugin) => plugin.id === 'demo-content-packs');
  if (!entry) {
    assert.ok(true, 'skip — demo-content-packs not in local registry');
    return;
  }
  const localDir = resolveLocalPluginSourceDir(entry);
  assert.ok(localDir, 'expected local monorepo plugin directory');
});

test('installPluginFromRegistryEntry rejects browse-only entries', async () => {
  await assert.rejects(
    () =>
      installPluginFromRegistryEntry({
        id: 'catalog-stub',
        name: 'Catalog Stub',
        version: '0.1.0',
        description: 'Browse only',
        scope: 'campaign',
        installable: false,
      }),
    /not installable/,
  );
});
