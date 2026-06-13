import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRemoteJsonUrl } from './fetchPluginManifest.js';

test('normalizeRemoteJsonUrl converts github blob links to raw.githubusercontent.com', () => {
  const normalized = normalizeRemoteJsonUrl(
    new URL('https://github.com/Esiana-ttrpg/community-plugins/blob/main/manifest.json'),
  );
  assert.equal(
    normalized.toString(),
    'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/manifest.json',
  );
});

test('normalizeRemoteJsonUrl leaves raw githubusercontent URLs unchanged', () => {
  const url = new URL(
    'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/manifest.json',
  );
  assert.equal(normalizeRemoteJsonUrl(url).toString(), url.toString());
});
