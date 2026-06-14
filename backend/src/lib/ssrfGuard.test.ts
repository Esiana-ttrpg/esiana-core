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
