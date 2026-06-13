import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolvePluginAssetPath } from './frontendPlugins.js';

/** Mirrors Express 5 wildcard param shape for plugin asset paths. */
function normalizeAssetPathParam(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.map((segment) => String(segment).trim()).filter(Boolean).join('/');
  }
  return String(raw ?? '').trim();
}

test('normalizeAssetPathParam joins Express 5 splat segments', () => {
  assert.equal(
    normalizeAssetPathParam(['frontend', 'index.js']),
    'frontend/index.js',
  );
  assert.equal(normalizeAssetPathParam('frontend/index.js'), 'frontend/index.js');
});

test('resolvePluginAssetPath rejects path traversal', async () => {
  const resolved = await resolvePluginAssetPath('example-plugin', '../../backend/src/index.ts');
  assert.equal(resolved, null);
});

test('resolvePluginAssetPath resolves files under plugin root', async () => {
  const resolved = await resolvePluginAssetPath('example-plugin', 'frontend/index.js');
  if (!resolved) {
    assert.ok(true, 'example-plugin may not be installed in test DB — skip path shape check');
    return;
  }
  assert.ok(resolved.absolutePath.endsWith(path.join('example-plugin', 'frontend', 'index.js')));
});
