import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchAndValidateManifestFromUrl,
  normalizeRemoteJsonUrl,
  resolveSafeRemoteJsonUrl,
} from './fetchPluginManifest.js';
import { SsrfGuardError } from './ssrfGuard.js';

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

test('resolveSafeRemoteJsonUrl blocks localhost', async () => {
  await assert.rejects(
    () =>
      resolveSafeRemoteJsonUrl(new URL('http://localhost/manifest.json'), {
        allowHttp: true,
      }),
    SsrfGuardError,
  );
});

test('resolveSafeRemoteJsonUrl blocks private IPv4 literals', async () => {
  await assert.rejects(
    () =>
      resolveSafeRemoteJsonUrl(new URL('https://192.168.1.1/manifest.json'), {
        allowHttp: true,
      }),
    SsrfGuardError,
  );
});

test('resolveSafeRemoteJsonUrl blocks link-local metadata IP literals', async () => {
  await assert.rejects(
    () =>
      resolveSafeRemoteJsonUrl(
        new URL('https://169.254.169.254/latest/meta-data'),
        { allowHttp: true },
      ),
    SsrfGuardError,
  );
});

test('resolveSafeRemoteJsonUrl allows public HTTPS URLs', async () => {
  const safe = await resolveSafeRemoteJsonUrl(new URL('https://example.com/manifest.json'), {
    allowHttp: true,
  });
  assert.equal(safe.hostname, 'example.com');
});

test('resolveSafeRemoteJsonUrl normalizes GitHub blob URLs before validation', async () => {
  const safe = await resolveSafeRemoteJsonUrl(
    new URL('https://github.com/Esiana-ttrpg/community-plugins/blob/main/manifest.json'),
    { allowHttp: true },
  );
  assert.equal(safe.hostname, 'raw.githubusercontent.com');
  assert.equal(
    safe.pathname,
    '/Esiana-ttrpg/community-plugins/main/manifest.json',
  );
});

test('fetchAndValidateManifestFromUrl does not call fetch when URL is blocked', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetchCalls += 1;
    return originalFetch(...args);
  }) as typeof fetch;

  try {
    const result = await fetchAndValidateManifestFromUrl(
      new URL('http://localhost/manifest.json'),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /not allowed|localhost/i);
    }
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
