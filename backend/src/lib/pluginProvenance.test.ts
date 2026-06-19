import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PLUGIN_REGISTRY_URL } from './pluginManifest.js';
import {
  deriveInstalledFrom,
  formatInstalledFromLabel,
  formatRegistryEntrySource,
  isPinnedCommitSha,
} from './pluginProvenance.js';

test('DEFAULT_PLUGIN_REGISTRY_URL uses inspectable GitHub blob link', () => {
  assert.match(DEFAULT_PLUGIN_REGISTRY_URL, /github\.com\/.*\/blob\/main\/registry\.json$/);
});

test('isPinnedCommitSha accepts 40-char hex', () => {
  assert.equal(
    isPinnedCommitSha('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    true,
  );
  assert.equal(isPinnedCommitSha('bundled'), false);
  assert.equal(isPinnedCommitSha('0000000000000000000000000000000000000001'), true);
});

test('deriveInstalledFrom maps registry install', () => {
  const result = deriveInstalledFrom({
    commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    sourceRepo: 'Esiana-ttrpg/community-plugins',
    registryUrl: DEFAULT_PLUGIN_REGISTRY_URL,
  });
  assert.equal(result.type, 'registry');
  assert.equal(result.sourceRepo, 'Esiana-ttrpg/community-plugins');
});

test('deriveInstalledFrom maps local-dev for bundled commitSha', () => {
  const result = deriveInstalledFrom({ commitSha: 'bundled' });
  assert.equal(result.type, 'local-dev');
});

test('formatInstalledFromLabel renders registry provenance', () => {
  const label = formatInstalledFromLabel({
    type: 'registry',
    sourceRepo: 'Esiana-ttrpg/community-plugins',
    commitSha: 'cccccccccccccccccccccccccccccccccccccccc',
  });
  assert.match(label, /community-plugins \(registry\) @ cccccccccccc/);
});

test('formatRegistryEntrySource renders repo and short sha', () => {
  const label = formatRegistryEntrySource({
    type: 'github',
    repo: 'acme/my-plugin',
    commitSha: 'dddddddddddddddddddddddddddddddddddddddd',
  });
  assert.equal(label, 'acme/my-plugin @ dddddddddddd');
});
