import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import {
  NetworkFetchError,
  createPinnedLookup,
  fetchAssetRemoteBuffer,
  fetchPluginRemoteText,
  summarizeErrorCauseChain,
  unreachableUrlError,
} from './networkFetch.js';

test('pinned lookup returns the validated address instead of resolving the hostname again', async () => {
  const lookup = createPinnedLookup([{ address: '203.0.113.20', family: 4 }]);
  const result = await new Promise<{ address: string; family: number }>((resolve, reject) => {
    lookup('rebinding.example', {}, (error, address, family) => error ? reject(error) : resolve({ address, family }));
  });
  assert.deepEqual(result, { address: '203.0.113.20', family: 4 });
});

test('pinned lookup returns every validated address when Node requests options.all', async () => {
  const addresses = [{ address: '203.0.113.20', family: 4 as const }, { address: '2001:db8::20', family: 6 as const }];
  const lookup = createPinnedLookup(addresses);
  const result = await new Promise<typeof addresses>((resolve, reject) => {
    lookup('rebinding.example', { all: true }, (error, resolved) => error ? reject(error) : resolve(resolved as typeof addresses));
  });
  assert.deepEqual(result, addresses);
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});

test('fetchPluginRemoteText rejects non-allowlisted host before fetch', async () => {
  let fetchCalled = false;
  globalThis.fetch = mock.fn(async () => {
    fetchCalled = true;
    return new Response('{}');
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchPluginRemoteText(new URL('https://example.com/manifest.json'), {
        maxBytes: 1024,
        timeoutSeconds: 5,
      }),
    (error: unknown) => {
      assert.ok(error instanceof NetworkFetchError);
      assert.match(error.message, /not allowed/);
      return true;
    },
  );
  assert.equal(fetchCalled, false);
});

test('fetchAssetRemoteBuffer rejects HTTP when allowHttp is false', async () => {
  let fetchCalled = false;
  globalThis.fetch = mock.fn(async () => {
    fetchCalled = true;
    return new Response('x');
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchAssetRemoteBuffer(new URL('http://example.com/image.png'), {
        allowHttp: false,
        maxBytes: 1024,
        timeoutSeconds: 5,
      }),
    NetworkFetchError,
  );
  assert.equal(fetchCalled, false);
});

test('summarizeErrorCauseChain includes nested errno codes', () => {
  const root = new Error('fetch failed');
  const nested = new Error('getaddrinfo ENOTFOUND github.com') as NodeJS.ErrnoException;
  nested.code = 'ENOTFOUND';
  root.cause = nested;

  assert.equal(
    summarizeErrorCauseChain(root),
    'fetch failed ← ENOTFOUND getaddrinfo ENOTFOUND github.com',
  );
});

test('unreachableUrlError keeps public message and logs URL without query', () => {
  const errorCalls: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errorCalls.push(args);
  };

  try {
    const root = new Error('fetch failed');
    const nested = new Error('connect ECONNREFUSED 127.0.0.1:443') as NodeJS.ErrnoException;
    nested.code = 'ECONNREFUSED';
    root.cause = nested;

    const mapped = unreachableUrlError(
      root,
      'https://github.com/org/repo/archive/abc.tar.gz?token=secret',
    );

    assert.ok(mapped instanceof NetworkFetchError);
    assert.equal(mapped.message, 'Unable to reach URL: fetch failed');
    assert.equal(errorCalls.length, 1);
    assert.equal(errorCalls[0][0], '[networkFetch] Unable to reach URL');
    assert.equal(errorCalls[0][1], 'https://github.com/org/repo/archive/abc.tar.gz');
    assert.match(String(errorCalls[0][2]), /ECONNREFUSED/);
  } finally {
    console.error = originalError;
  }
});
