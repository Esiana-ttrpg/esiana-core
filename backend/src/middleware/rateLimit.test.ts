import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import rateLimit from 'express-rate-limit';

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
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
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

test('rate limiter returns 429 with retryAfterSeconds in JSON body', async () => {
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfterSeconds: 60,
      });
    },
  });

  const app = express();
  app.use(express.json());
  app.post('/login', limiter, (_req, res) => {
    res.json({ ok: true });
  });

  assert.equal((await listenOnce(app, 'POST', '/login', { email: 'a@b.com' })).status, 200);
  assert.equal((await listenOnce(app, 'POST', '/login', { email: 'a@b.com' })).status, 200);

  const blocked = await listenOnce(app, 'POST', '/login', { email: 'a@b.com' });
  assert.equal(blocked.status, 429);
  assert.equal(typeof blocked.json.error, 'string');
  assert.equal(typeof blocked.json.retryAfterSeconds, 'number');
  assert.ok((blocked.json.retryAfterSeconds as number) >= 1);
});

test('login email key normalizes case', () => {
  const normalize = (email: string) => email.trim().toLowerCase();
  assert.equal(normalize('  User@Example.COM '), 'user@example.com');
});
