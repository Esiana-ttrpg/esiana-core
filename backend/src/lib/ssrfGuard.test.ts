import assert from 'node:assert/strict';
import test from 'node:test';
import { SsrfGuardError, assertUrlSafeForImport } from './ssrfGuard.js';

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
