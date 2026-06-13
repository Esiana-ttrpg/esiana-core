import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isRegistryEntryInstallable,
  isValidCommitSha,
  parsePluginRegistryIndex,
  validatePluginGithubSource,
  validatePluginRegistryEntry,
} from './pluginManifest.js';

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
