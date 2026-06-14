import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SsrfGuardError,
  assertUrlSafeForImport,
  isUrlSafeForImport,
} from './ssrfGuard.js';

test('assertUrlSafeForImport blocks localhost', async () => {
  await assert.rejects(
    () => assertUrlSafeForImport(new URL('http://localhost/image.png'), { allowHttp: true }),
    SsrfGuardError,
  );
});

test('assertUrlSafeForImport blocks private IPv4 literals', async () => {
  await assert.rejects(
    () => assertUrlSafeForImport(new URL('http://192.168.1.10/image.png'), { allowHttp: true }),
    SsrfGuardError,
  );
});

test('assertUrlSafeForImport requires HTTPS when HTTP disallowed', async () => {
  await assert.rejects(
    () =>
      assertUrlSafeForImport(new URL('http://example.com/image.png'), {
        allowHttp: false,
      }),
    SsrfGuardError,
  );
});

test('assertUrlSafeForImport rejects URLs with embedded credentials', async () => {
  await assert.rejects(
    () =>
      assertUrlSafeForImport(new URL('https://user:pass@example.com/file.json'), {
        allowHttp: true,
      }),
    SsrfGuardError,
  );
});

test('assertUrlSafeForImport rejects userinfo URLs targeting private IPs', async () => {
  await assert.rejects(
    () =>
      assertUrlSafeForImport(new URL('https://foo@127.0.0.1/file.json'), {
        allowHttp: true,
      }),
    SsrfGuardError,
  );
});

test('assertUrlSafeForImport blocks link-local metadata IP literals', async () => {
  await assert.rejects(
    () =>
      assertUrlSafeForImport(
        new URL('https://169.254.169.254/latest/meta-data'),
        { allowHttp: true },
      ),
    SsrfGuardError,
  );
});

test('isUrlSafeForImport returns true for public HTTPS URLs', async () => {
  assert.equal(
    await isUrlSafeForImport(new URL('https://example.com/manifest.json'), {
      allowHttp: true,
    }),
    true,
  );
});

test('isUrlSafeForImport returns false for localhost', async () => {
  assert.equal(
    await isUrlSafeForImport(new URL('http://localhost/manifest.json'), {
      allowHttp: true,
    }),
    false,
  );
});

test('isUrlSafeForImport returns false for private IPv4 literals', async () => {
  assert.equal(
    await isUrlSafeForImport(new URL('https://192.168.1.10/manifest.json'), {
      allowHttp: true,
    }),
    false,
  );
});

test('isUrlSafeForImport returns false for link-local metadata IP literals', async () => {
  assert.equal(
    await isUrlSafeForImport(
      new URL('https://169.254.169.254/latest/meta-data'),
      { allowHttp: true },
    ),
    false,
  );
});

test('isUrlSafeForImport returns false for URLs with embedded credentials', async () => {
  assert.equal(
    await isUrlSafeForImport(new URL('https://user:pass@example.com/file.json'), {
      allowHttp: true,
    }),
    false,
  );
});
