import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test, { after, type TestContext } from 'node:test';
import express from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../config/env.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

const previous = { ...env.rateLimit };
Object.assign(env.rateLimit, { enabled: true, mutationMax: 2, mutationWindowMs: 60000 });
const { audioUploadsRouter } = await import('./audioUploads.js');
after(() => Object.assign(env.rateLimit, previous));

const patch = audioUploadsRouter.stack.find((layer) => layer.route?.methods.patch)!.route!;
const remove = audioUploadsRouter.stack.find((layer) => layer.route?.methods.delete)!.route!;
const limiter = patch.stack[0].handle as RateLimitRequestHandler;

async function fixture(t: TestContext, userId: string, inherited: boolean) {
  const app = express();
  app.use((req, _res, next) => { Object.assign(req, { user: { id: userId }, authMethod: 'session' }); next(); });
  if (inherited) app.use(rateLimitPolicy('mutation', { max: 2, windowMs: 60000 }));
  let filesystemOperations = 0;
  app.patch('/', limiter, express.raw({ type: 'application/octet-stream', limit: '1b' }), (_req, res) => {
    filesystemOperations++; res.status(204).end();
  });
  app.delete('/', limiter, (_req, res) => { filesystemOperations++; res.status(204).end(); });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    operations: () => filesystemOperations,
    request: (method: 'PATCH' | 'DELETE', body = 'x') => fetch(origin, { method, signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/octet-stream' }, ...(method === 'PATCH' ? { body } : {}) }),
  };
}

test('PATCH and DELETE install the same native mutation guard before their handlers and body parser', () => {
  assert.equal(remove.stack[0].handle, limiter);
  assert.equal((limiter as unknown as { rateLimitPolicy: string }).rateLimitPolicy, 'mutation');
  assert.equal(typeof limiter.getKey, 'function');
});

test('standalone upload mutations share an allowance and reject before parsing or filesystem work', async (t) => {
  const app = await fixture(t, 'standalone-upload', false);
  assert.equal((await app.request('PATCH')).status, 204);
  assert.equal((await app.request('DELETE')).status, 204);
  const limited = await app.request('PATCH', 'too large for the parser');
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, 'RATE_LIMITED');
  assert.ok(limited.headers.get('Retry-After'));
  assert.equal(app.operations(), 2);
});

test('the parent mutation budget is enforced without charging the native upload guard again', async (t) => {
  const app = await fixture(t, 'inherited-upload', true);
  assert.equal((await app.request('PATCH')).status, 204);
  assert.equal((await app.request('DELETE')).status, 204);
  assert.equal((await app.request('PATCH')).status, 429);
  assert.equal(await limiter.getKey('user:inherited-upload'), undefined);
  assert.equal(app.operations(), 2);
});

test('the native upload guard honors the global rate-limit disable setting', async (t) => {
  env.rateLimit.enabled = false;
  try {
    const app = await fixture(t, 'disabled-upload', false);
    for (let i = 0; i < 3; i++) assert.equal((await app.request('PATCH')).status, 204);
    assert.equal(await limiter.getKey('user:disabled-upload'), undefined);
  } finally { env.rateLimit.enabled = true; }
});
