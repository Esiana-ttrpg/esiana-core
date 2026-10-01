import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchAndValidateManifestFromUrl,
  normalizeRemoteJsonUrl,
} from './fetchPluginManifest.js';
import './fetchPluginRegistry.test.js';

const validManifest = JSON.stringify({
  id: 'fixture-plugin',
  name: 'Fixture Plugin',
  version: '1.0.0',
  description: 'A manifest fetch fixture',
  scope: 'campaign',
});

test('normalizeRemoteJsonUrl converts github blob links to raw.githubusercontent.com', () => {
  const normalized = normalizeRemoteJsonUrl(
    new URL('https://github.com/Esiana-ttrpg/community-plugins/blob/main/manifest.json'),
  );
  assert.equal(
    normalized.toString(),
    'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/manifest.json',
  );
});

test('normalizeRemoteJsonUrl converts canonical GitHub repository file URLs using the default branch', () => {
  const normalized = normalizeRemoteJsonUrl(
    new URL('https://github.com/Esiana-ttrpg/community-plugins/registry.json'),
  );
  assert.equal(
    normalized.toString(),
    'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/HEAD/registry.json',
  );
});

test('normalizeRemoteJsonUrl leaves raw githubusercontent URLs unchanged', () => {
  const url = new URL(
    'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/manifest.json',
  );
  assert.equal(normalizeRemoteJsonUrl(url).toString(), url.toString());
});

test('raw GitHub manifest URLs accept JSON served as text/plain', async () => {
  const result = await fetchAndValidateManifestFromUrl(
    new URL('https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/grimmory/manifest.json'),
    async () => ({ text: validManifest, contentType: 'text/plain; charset=utf-8' }),
  );

  assert.equal(result.ok, true);
});

test('manifest URLs on unrelated hosts still reject text/plain', async () => {
  const result = await fetchAndValidateManifestFromUrl(
    new URL('https://example.com/manifest.json'),
    async () => ({ text: validManifest, contentType: 'text/plain; charset=utf-8' }),
  );

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: 'Manifest URL must return JSON (application/json)',
  });
});
