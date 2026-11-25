import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { configuredCorsOrigins } from './corsOrigins.js';

test('retains the application origin and explicitly allowed integration origins', () => {
  assert.deepEqual(configuredCorsOrigins('https://esiana.example', ' https://foundry.example, https://foundry.example '), ['https://esiana.example', 'https://foundry.example']);
  assert.deepEqual(configuredCorsOrigins('https://esiana.example', ''), ['https://esiana.example']);
});

test('rejects wildcards, paths, credentials and non-web origins', () => {
  for (const value of ['*', 'https://example.test/path', 'https://u:p@example.test', 'null', 'file:///tmp']) {
    assert.throws(() => configuredCorsOrigins('https://esiana.example', value));
  }
});

test('preflight echoes an allowed Foundry origin and excludes unconfigured origins', async () => {
  const app = express();
  app.use(cors({ origin: configuredCorsOrigins('https://esiana.example', 'https://foundry.example'), credentials: true }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const request = (origin: string) => fetch(`http://127.0.0.1:${address.port}/api/campaigns`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization,content-type' } });
    const allowed = await request('https://foundry.example');
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://foundry.example');
    assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
    const denied = await request('https://other.example');
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  } finally { await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); }
});
