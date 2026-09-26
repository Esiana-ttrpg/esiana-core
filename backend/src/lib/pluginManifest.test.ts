import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isRegistryEntryInstallable,
  isValidCommitSha,
  parsePluginRegistryIndex,
  validatePluginGithubSource,
  validatePluginRegistryEntry,
  validatePluginManifest,
} from './pluginManifest.js';

test('connection manifests accept exact HTTPS and loopback origins', () => {
  const result = validatePluginManifest({ id: 'fixture-provider', name: 'Fixture', version: '1.0.0', description: 'Fixture provider', scope: 'campaign', permissions: ['connections:use', 'network:fetch'], outboundOrigins: ['https://api.example.com', 'http://localhost:4319'] });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.manifest.outboundOrigins, ['https://api.example.com', 'http://localhost:4319']);
});

test('connection manifests reject paths, wildcard hosts, and non-loopback HTTP', () => {
  for (const origin of ['https://api.example.com/v1', 'https://*.example.com', 'http://api.example.com']) {
    const result = validatePluginManifest({ id: 'fixture-provider', name: 'Fixture', version: '1.0.0', description: 'Fixture provider', scope: 'campaign', outboundOrigins: [origin] });
    assert.equal(result.ok, false, origin);
  }
});

test('character pages support canvas and plugin-owned renderers', () => {
  const result = validatePluginManifest({
    id: 'sheet-provider',
    name: 'Sheet Provider',
    version: '1.0.0',
    description: 'Purpose-built character sheets',
    scope: 'campaign',
    characterPages: [
      {
        key: 'sheet', title: 'Sheet', renderMode: 'PLUGIN', renderer: 'characterSheet', schemaVersion: 3,
        fields: [{ key: 'armor-class', label: 'Armor Class', type: 'NUMBER', validation: { min: 0 } }],
      },
      { key: 'notes', title: 'Notes', renderMode: 'CANVAS', schemaVersion: 1, canvas: { allowAddWidget: true, allowArrange: true } },
    ],
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.manifest.characterPages?.length, 2);
    assert.deepEqual(result.manifest.characterPages?.[0]?.fields?.[0], {
      key: 'armor-class', label: 'Armor Class', type: 'NUMBER', validation: { min: 0 },
    });
  }
});

test('plugin-owned character pages require a renderer', () => {
  const result = validatePluginManifest({
    id: 'bad-sheet',
    name: 'Bad Sheet',
    version: '1.0.0',
    description: 'Missing renderer',
    scope: 'campaign',
    characterPages: [{ key: 'sheet', title: 'Sheet', renderMode: 'PLUGIN', schemaVersion: 1 }],
  });
  assert.equal(result.ok, false);
});

test('isValidCommitSha accepts 40-char hex and rejects branch-like refs', () => {
  assert.equal(isValidCommitSha('abcdef0123456789abcdef0123456789abcdef01'), true);
  assert.equal(isValidCommitSha('main'), false);
  assert.equal(isValidCommitSha('v1.0.0'), false);
  assert.equal(isValidCommitSha('abc123'), false);
});

test('validatePluginGithubSource rejects branch, tag, and ref fields', () => {
  const result = validatePluginGithubSource({
    type: 'github',
    repo: 'Esiana-ttrpg/community-plugins',
    commitSha: 'abcdef0123456789abcdef0123456789abcdef01',
    path: 'example-plugin',
    branch: 'main',
  });
  assert.ok(result.errors.some((e) => e.includes('commitSha only')));
});

test('validatePluginGithubSource accepts pinned github source', () => {
  const result = validatePluginGithubSource({
    type: 'github',
    repo: 'Esiana-ttrpg/community-plugins',
    commitSha: 'abcdef0123456789abcdef0123456789abcdef01',
    path: 'example-plugin',
  });
  assert.equal(result.errors.length, 0);
  assert.equal(result.source?.repo, 'Esiana-ttrpg/community-plugins');
});

test('parsePluginRegistryIndex accepts inline manifests and lightweight entries', () => {
  const parsed = parsePluginRegistryIndex({
    plugins: [
      {
        id: 'inline-plugin',
        name: 'Inline Plugin',
        version: '1.0.0',
        description: 'Full inline manifest',
        scope: 'global',
        category: 'utility',
      },
      {
        id: 'remote-plugin',
        name: 'Remote Plugin',
        version: '2.0.0',
        description: 'Index entry with manifestUrl',
        scope: 'global',
        category: 'integration',
        manifestUrl: 'https://example.com/manifest.json',
        source: {
          type: 'github',
          repo: 'org/repo',
          commitSha: 'abcdef0123456789abcdef0123456789abcdef01',
          path: 'plugins/remote-plugin',
        },
      },
      {
        id: 'catalog-stub',
        name: 'Catalog Stub',
        version: '0.1.0',
        description: 'Browse only',
        scope: 'campaign',
        category: 'theme',
        installable: false,
      },
    ],
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.plugins.length, 3);
});

test('isRegistryEntryInstallable requires pinned github source', () => {
  const installable = validatePluginRegistryEntry({
    id: 'remote-plugin',
    name: 'Remote Plugin',
    version: '1.0.0',
    description: 'Installable',
    scope: 'global',
    source: {
      type: 'github',
      repo: 'org/repo',
      commitSha: 'abcdef0123456789abcdef0123456789abcdef01',
      path: 'plugins/remote-plugin',
    },
  });
  assert.equal(installable.ok, true);
  if (!installable.ok) return;
  assert.equal(isRegistryEntryInstallable(installable.entry), true);

  const stub = validatePluginRegistryEntry({
    id: 'catalog-stub',
    name: 'Catalog Stub',
    version: '0.1.0',
    description: 'Browse only',
    scope: 'global',
    installable: false,
  });
  assert.equal(stub.ok, true);
  if (!stub.ok) return;
  assert.equal(isRegistryEntryInstallable(stub.entry), false);
});

test('validatePluginRegistryEntry accepts bundled campaign plugin source', () => {
  const result = validatePluginRegistryEntry({
    id: 'wiki-opds-feed',
    name: 'Wiki OPDS Feed',
    version: '0.1.0',
    description: 'Bundled campaign plugin',
    scope: 'campaign',
    category: 'wiki',
    source: { type: 'bundled' },
    installable: true,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.entry.source?.type, 'bundled');
  assert.equal(isRegistryEntryInstallable(result.entry), true);
});

test('parsePluginRegistryIndex rejects invalid category values', () => {
  const parsed = parsePluginRegistryIndex({
    plugins: [
      {
        id: 'bad-category',
        name: 'Bad Category',
        version: '1.0.0',
        description: 'Invalid category',
        scope: 'global',
        category: 'not-a-category',
      },
    ],
  });
  assert.equal(parsed.ok, false);
});

test('parsePluginRegistryIndex accepts a single plugin manifest object', () => {
  const parsed = parsePluginRegistryIndex({
    id: 'example-plugin',
    name: 'Example Plugin',
    version: '1.0.0',
    description: 'Reference plugin demonstrating global scope, configTemplate fields, and runtime entry points.',
    scope: 'global',
    category: 'utility',
    configTemplate: [],
    githubUrl: 'https://github.com/esiana/example-plugin',
    backendEntry: 'backend/index.js',
    frontendEntry: 'frontend/index.js',
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.plugins.length, 1);
  assert.equal(parsed.plugins[0]?.id, 'example-plugin');
  assert.equal(isRegistryEntryInstallable(parsed.plugins[0]!), false);
});
