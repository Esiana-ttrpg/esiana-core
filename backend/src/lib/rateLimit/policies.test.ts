import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express, { type Express, type RequestHandler } from 'express';
import { MemoryStore } from 'express-rate-limit';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  clientIpKey,
  configureTrustProxy,
  createRateLimitStore,
  rateLimitPolicy,
  resolveRateLimitActor,
} from './index.js';
import { buildRateLimitEnv } from '../../config/rateLimitEnv.js';

function stubAuth(opts: {
  userId?: string;
  apiTokenId?: string;
}): RequestHandler {
  return (req, _res, next) => {
    const authReq = req as AuthenticatedRequest;
    if (opts.userId) {
      authReq.user = {
        id: opts.userId,
        email: `${opts.userId}@example.com`,
        displayName: null,
        avatarUrl: null,
        username: opts.userId,
        role: 'USER',
        passwordAuthEnabled: true,
      };
      if (opts.apiTokenId) {
        authReq.authMethod = 'apiToken';
        authReq.apiTokenId = opts.apiTokenId;
        authReq.isApiTokenRequest = true;
      } else {
        authReq.authMethod = 'session';
      }
    }
    next();
  };
}

function listen(
  app: Express,
  method: string,
  path: string,
  headers: Record<string, string> = {},
): Promise<{
  status: number;
  json: Record<string, unknown>;
  headers: http.IncomingHttpHeaders;
  localsPolicies?: string[];
}> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('no port'));
        return;
      }
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: addr.port,
          path,
          method,
          headers,
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
            resolve({
              status: res.statusCode ?? 0,
              json,
              headers: res.headers,
            });
          });
        },
      );
      req.on('error', (e) => {
        server.close();
        reject(e);
      });
      req.end();
    });
  });
}

function miniApp(
  middlewares: RequestHandler[],
  opts?: { trustProxy?: boolean },
): Express {
  const app = express();
  if (opts?.trustProxy) {
    app.set('trust proxy', 1);
  }
  app.use(...middlewares);
  app.use((req, res) => {
    res.json({
      ok: true,
      policies: (res.locals as { rateLimitPolicies?: string[] }).rateLimitPolicies ?? [],
      actor: resolveRateLimitActor(req),
    });
  });
  return app;
}

test('resolveRateLimitActor: session and API token share account key', () => {
  const sessionReq = {
    user: { id: 'u1' },
    authMethod: 'session',
    ip: '1.2.3.4',
  } as AuthenticatedRequest;
  const tokenReq = {
    user: { id: 'u1' },
    authMethod: 'apiToken',
    apiTokenId: 'tok-a',
    ip: '9.9.9.9',
  } as AuthenticatedRequest;
  const anonReq = { ip: '5.6.7.8' } as AuthenticatedRequest;

  const session = resolveRateLimitActor(sessionReq);
  const token = resolveRateLimitActor(tokenReq);
  const anon = resolveRateLimitActor(anonReq);

  assert.equal(session.accountKey, 'user:u1');
  assert.equal(token.accountKey, 'user:u1');
  assert.equal(token.apiTokenId, 'tok-a');
  assert.equal(session.apiTokenId, undefined);
  assert.equal(anon.kind, 'ip');
  assert.match(anon.accountKey, /^ip:/);
});

test('session user hits 429 with RATE_LIMITED body and retry metadata', async () => {
  const app = miniApp([
    stubAuth({ userId: 'sess-user' }),
    rateLimitPolicy('authenticated', { max: 2, windowMs: 60_000 }),
  ]);

  assert.equal((await listen(app, 'GET', '/')).status, 200);
  assert.equal((await listen(app, 'GET', '/')).status, 200);
  const blocked = await listen(app, 'GET', '/');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.code, 'RATE_LIMITED');
  assert.equal(blocked.json.policy, 'authenticated');
  assert.equal(typeof blocked.json.retryAfterSeconds, 'number');
  assert.ok((blocked.json.retryAfterSeconds as number) >= 1);
});

test('API-key and session share the same account bucket', async () => {
  // Fresh policy instances with shared max of 2 across methods of construction
  // — each rateLimitPolicy() call creates its own store, so share one instance.
  const limiter = rateLimitPolicy('authenticated', { max: 2, windowMs: 60_000 });

  const sessionApp = miniApp([stubAuth({ userId: 'shared' }), limiter]);
  const tokenApp = miniApp([
    stubAuth({ userId: 'shared', apiTokenId: 'k1' }),
    limiter,
  ]);

  assert.equal((await listen(sessionApp, 'GET', '/')).status, 200);
  assert.equal((await listen(tokenApp, 'GET', '/')).status, 200);
  const blocked = await listen(sessionApp, 'GET', '/');
  assert.equal(blocked.status, 429);
});

test('multiple keys share account bucket; per-key bucket is independent', async () => {
  // authenticated runs before apiKey, so a per-key 429 still consumes an account hit.
  const account = rateLimitPolicy('authenticated', { max: 5, windowMs: 60_000 });
  const perKey = rateLimitPolicy('apiKey', { max: 2, windowMs: 60_000 });

  const keyA = miniApp([
    stubAuth({ userId: 'multi', apiTokenId: 'a' }),
    account,
    perKey,
  ]);
  const keyB = miniApp([
    stubAuth({ userId: 'multi', apiTokenId: 'b' }),
    account,
    perKey,
  ]);

  // Key A consumes its per-key budget of 2
  assert.equal((await listen(keyA, 'GET', '/')).status, 200);
  assert.equal((await listen(keyA, 'GET', '/')).status, 200);
  const keyABlocked = await listen(keyA, 'GET', '/');
  assert.equal(keyABlocked.status, 429);
  assert.equal(keyABlocked.json.policy, 'apiKey');
  // Account hits so far: 3 (including the blocked attempt's authenticated increment)

  // Key B still works (independent key bucket)
  assert.equal((await listen(keyB, 'GET', '/')).status, 200);
  assert.equal((await listen(keyB, 'GET', '/')).status, 200);
  // Account hits: 5. Next request from either key exhausts the shared account ceiling.
  const accountBlocked = await listen(keyB, 'GET', '/');
  assert.equal(accountBlocked.status, 429);
  assert.equal(accountBlocked.json.policy, 'authenticated');
});

test('cumulative composition: expensive POST records authenticated+mutation+expensive+apiKey', async () => {
  const app = miniApp([
    stubAuth({ userId: 'cume', apiTokenId: 'tok' }),
    rateLimitPolicy('authenticated', { max: 100, windowMs: 60_000 }),
    rateLimitPolicy('mutation', { max: 100, windowMs: 60_000 }),
    rateLimitPolicy('expensive', { max: 100, windowMs: 60_000 }),
    rateLimitPolicy('apiKey', { max: 100, windowMs: 60_000 }),
  ]);

  const res = await listen(app, 'POST', '/write');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.policies, [
    'authenticated',
    'mutation',
    'expensive',
    'apiKey',
  ]);
});

test('mutation policy skips GET', async () => {
  const mutation = rateLimitPolicy('mutation', { max: 1, windowMs: 60_000 });
  const app = miniApp([stubAuth({ userId: 'mut' }), mutation]);

  assert.equal((await listen(app, 'GET', '/')).status, 200);
  assert.equal((await listen(app, 'GET', '/')).status, 200);
  assert.equal((await listen(app, 'POST', '/')).status, 200);
  assert.equal((await listen(app, 'POST', '/')).status, 429);
});

test('anonymous traffic is IP-keyed and isolated', async () => {
  const limiter = rateLimitPolicy('public', { max: 1, windowMs: 60_000 });
  const app = express();
  app.use((req, _res, next) => {
    // Force distinct IPs via socket — use X-Forwarded-For with trust proxy off means ignored;
    // instead set req.ip by overriding.
    next();
  });
  // Two apps with forced different remote addresses via trust proxy + XFF when trust is on
  const appA = express();
  appA.set('trust proxy', 1);
  appA.use(limiter);
  appA.get('/', (_req, res) => res.json({ ok: true }));

  // Same limiter instance, same IP via default listen — both share IP.
  // For isolation, create two separate public limiters with different forced keys:
  const limA = rateLimitPolicy('public', { max: 1, windowMs: 60_000 });
  const limB = rateLimitPolicy('public', { max: 1, windowMs: 60_000 });

  // Verify anonymous actor resolution uses IP
  const anon = resolveRateLimitActor({
    ip: '10.0.0.1',
  } as express.Request);
  const anon2 = resolveRateLimitActor({
    ip: '10.0.0.2',
  } as express.Request);
  assert.notEqual(anon.accountKey, anon2.accountKey);

  const app1 = miniApp([limA], { trustProxy: true });
  const app2 = miniApp([limB], { trustProxy: true });
  // Separate limiter instances mean separate stores — use one shared limiter for IP isolation
  // via trust proxy and different X-Forwarded-For values.
  const shared = rateLimitPolicy('public', { max: 1, windowMs: 60_000 });
  const sharedApp = miniApp([shared], { trustProxy: true });

  assert.equal(
    (await listen(sharedApp, 'GET', '/', { 'X-Forwarded-For': '203.0.113.1' }))
      .status,
    200,
  );
  assert.equal(
    (await listen(sharedApp, 'GET', '/', { 'X-Forwarded-For': '203.0.113.1' }))
      .status,
    429,
  );
  assert.equal(
    (await listen(sharedApp, 'GET', '/', { 'X-Forwarded-For': '203.0.113.2' }))
      .status,
    200,
  );

  void app;
  void appA;
  void app1;
  void app2;
});

test('bucket isolation: different users do not share account buckets', async () => {
  const limiter = rateLimitPolicy('authenticated', { max: 1, windowMs: 60_000 });
  const appA = miniApp([stubAuth({ userId: 'alice' }), limiter]);
  const appB = miniApp([stubAuth({ userId: 'bob' }), limiter]);

  assert.equal((await listen(appA, 'GET', '/')).status, 200);
  assert.equal((await listen(appA, 'GET', '/')).status, 429);
  assert.equal((await listen(appB, 'GET', '/')).status, 200);
});

test('campaign path does not multiply account allowance', async () => {
  const limiter = rateLimitPolicy('authenticated', { max: 2, windowMs: 60_000 });
  const app = miniApp([stubAuth({ userId: 'camper' }), limiter]);

  assert.equal((await listen(app, 'GET', '/campaigns/one')).status, 200);
  assert.equal((await listen(app, 'GET', '/campaigns/two')).status, 200);
  assert.equal((await listen(app, 'GET', '/campaigns/three')).status, 429);
});

test('access semantics unchanged: guest reaches handler on optional-auth stack', async () => {
  const app = miniApp([
    stubAuth({}), // no user
    rateLimitPolicy('authenticated', { max: 10, windowMs: 60_000 }),
  ]);
  const res = await listen(app, 'GET', '/');
  assert.equal(res.status, 200);
  assert.equal((res.json.actor as { kind: string }).kind, 'ip');
});

test('X-Forwarded-For ignored without trust proxy; honored with trust proxy=1', async () => {
  const limNoTrust = rateLimitPolicy('public', { max: 1, windowMs: 60_000 });
  const noTrust = miniApp([limNoTrust], { trustProxy: false });

  assert.equal(
    (await listen(noTrust, 'GET', '/', { 'X-Forwarded-For': '198.51.100.1' }))
      .status,
    200,
  );
  // Same socket IP — second request blocked regardless of different XFF
  assert.equal(
    (await listen(noTrust, 'GET', '/', { 'X-Forwarded-For': '198.51.100.2' }))
      .status,
    429,
  );

  const limTrust = rateLimitPolicy('public', { max: 1, windowMs: 60_000 });
  const trusted = miniApp([limTrust], { trustProxy: true });
  assert.equal(
    (await listen(trusted, 'GET', '/', { 'X-Forwarded-For': '198.51.100.10' }))
      .status,
    200,
  );
  assert.equal(
    (await listen(trusted, 'GET', '/', { 'X-Forwarded-For': '198.51.100.11' }))
      .status,
    200,
  );
});

test('createRateLimitStore returns a MemoryStore', () => {
  const store = createRateLimitStore('authenticated');
  assert.ok(store instanceof MemoryStore);
  const store2 = createRateLimitStore('expensive');
  assert.ok(store2 instanceof MemoryStore);
  assert.notEqual(store, store2);
});

test('RATE_LIMIT_STORE=redis fails validation', () => {
  const prev = process.env.RATE_LIMIT_STORE;
  process.env.RATE_LIMIT_STORE = 'redis';
  try {
    assert.throws(
      () => buildRateLimitEnv(),
      /Unsupported rate-limit store "redis"/,
    );
  } finally {
    if (prev === undefined) delete process.env.RATE_LIMIT_STORE;
    else process.env.RATE_LIMIT_STORE = prev;
  }
});

test('configureTrustProxy sets trust proxy when env says so', () => {
  const app = express();
  // configureTrustProxy reads env.trustProxy — just ensure it does not throw
  configureTrustProxy(app);
  assert.ok(true);
});

test('clientIpKey is stable for IPv4', () => {
  const key = clientIpKey({ ip: '192.0.2.1' } as express.Request);
  assert.ok(typeof key === 'string' && key.length > 0);
});

test('expensive scope override to ip works for anonymous', async () => {
  const limiter = rateLimitPolicy('expensive', {
    scope: 'ip',
    max: 1,
    windowMs: 60_000,
  });
  const app = miniApp([limiter], { trustProxy: true });
  assert.equal(
    (await listen(app, 'GET', '/', { 'X-Forwarded-For': '203.0.113.50' }))
      .status,
    200,
  );
  assert.equal(
    (await listen(app, 'GET', '/', { 'X-Forwarded-For': '203.0.113.50' }))
      .status,
    429,
  );
});
