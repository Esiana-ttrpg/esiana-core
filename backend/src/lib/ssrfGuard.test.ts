import assert from 'node:assert/strict';
import test from 'node:test';
import { SsrfGuardError, assertUrlSafeForImport, isUrlSafeForImportSync } from './ssrfGuard.js';

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

test('assertUrlSafeForImport rejects URL userinfo credentials', async () => {
  await assert.rejects(
    () =>
      assertUrlSafeForImport(new URL('https://user:pass@example.com/image.png'), {
        allowHttp: false,
      }),
    (error: unknown) =>
      error instanceof SsrfGuardError && error.message.includes('credentials'),
  );
});

test('isUrlSafeForImportSync rejects URL userinfo credentials', () => {
  assert.equal(
    isUrlSafeForImportSync(new URL('https://user:pass@example.com/image.png'), {
      allowHttp: false,
    }),
    false,
  );
});

test('isUrlSafeForImportSync rejects private IPv4 literals', () => {
  assert.equal(
    isUrlSafeForImportSync(new URL('http://192.168.1.10/image.png'), { allowHttp: true }),
    false,
  );
});
