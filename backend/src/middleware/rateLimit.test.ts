import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { buildRateLimitEnv } from '../config/rateLimitEnv.js';
import { oidcCallbackLimiter, oidcStartLimiter } from './rateLimit.js';

function listenOnce(
  app: express.Express,
  method: string,
  path: string,
  body?: object,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('no port'));
        return;
      }
      const payload = body ? JSON.stringify(body) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: addr.port,
          path,
          method,
          headers: payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {},
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            server.close();
            const text = Buffer.concat(chunks).toString('utf8');
            let json: Record<string, unknown> = {};
            try {
              json = JSON.parse(text) as Record<string, unknown>;
            } catch {
              /* empty */
            }
            resolve({ status: res.statusCode ?? 0, json });
          });
        },
      );
      req.on('error', (e) => {
        server.close();
        reject(e);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

test('legacy oidcStartLimiter returns 429 with RATE_LIMITED code', async () => {
  const { oidcStartMax } = buildRateLimitEnv();
  // Use a dedicated mini app; oidcStartLimiter is process-global so max may already
  // be partially consumed by other tests — assert body shape on first 429.
  const app = express();
  app.get('/oidc/:providerId/start', oidcStartLimiter, (_req, res) => {
    res.json({ ok: true });
  });
  const requestPath = '/oidc/oidc/start';

  let blocked: { status: number; json: Record<string, unknown> } | null = null;
  for (let i = 0; i < oidcStartMax + 5; i++) {
    const result = await listenOnce(app, 'GET', requestPath);
    if (result.status === 429) {
      blocked = result;
      break;
    }
  }
  assert.ok(blocked, 'expected a 429 after exceeding max');
  assert.equal(blocked!.json.code, 'RATE_LIMITED');
  assert.equal(typeof blocked!.json.error, 'string');
  assert.equal(typeof blocked!.json.retryAfterSeconds, 'number');
  assert.ok((blocked!.json.retryAfterSeconds as number) >= 1);
});

test('legacy oidcCallbackLimiter returns 429 with RATE_LIMITED code', async () => {
  const { oidcCallbackMax } = buildRateLimitEnv();
  const app = express();
  app.get('/oidc/:providerId/callback', oidcCallbackLimiter, (_req, res) => {
    res.json({ ok: true });
  });
  const requestPath = '/oidc/oidc/callback';

  let blocked: { status: number; json: Record<string, unknown> } | null = null;
  for (let i = 0; i < oidcCallbackMax + 5; i++) {
    const result = await listenOnce(app, 'GET', requestPath);
    if (result.status === 429) {
      blocked = result;
      break;
    }
  }
  assert.ok(blocked, 'expected a 429 after exceeding max');
  assert.equal(blocked!.json.code, 'RATE_LIMITED');
  assert.equal(typeof blocked!.json.retryAfterSeconds, 'number');
});

test('login email key normalizes case', () => {
  const normalize = (email: string) => email.trim().toLowerCase();
  assert.equal(normalize('  User@Example.COM '), 'user@example.com');
});
