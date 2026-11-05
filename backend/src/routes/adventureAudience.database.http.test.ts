import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';

test('campaign router enforces Party-preview guard and campaign boundaries', async t => {
  if (!process.env.TEST_DATABASE_URL) { t.skip('TEST_DATABASE_URL is required'); return; }
  if ((globalThis as { prisma?: unknown }).prisma) {
    t.skip('Run separately so the test database is selected before Prisma initialization');
    return;
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // An independently generated SQLite client lets this suite use an isolated
  // database without replacing the working tree's generated Prisma client.
  if (process.env.TEST_SQLITE_CLIENT_URL) {
    const { PrismaClient } = await import(process.env.TEST_SQLITE_CLIENT_URL);
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
    (globalThis as { prisma?: unknown }).prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: process.env.TEST_DATABASE_URL }),
    });
  }
  const { prisma } = await import('../lib/prisma.js');
  const { env } = await import('../config/env.js');
  const { signAuthTokenForUser } = await import('../middleware/auth.js');
  const { campaignScopedRouter } = await import('./campaignScoped.js');
  const stamp = randomUUID();
  const ids = ['owner', 'player', 'outsider'].map(name => `${name}-${stamp}`);
  const [ownerId, playerId, outsiderId] = ids;
  const campaignId = `audience-${stamp}`;
  const handle = `audience-${stamp}`;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    for (const id of ids) await prisma.user.create({ data: { id, email: `${id}@example.invalid` } });
    await prisma.campaign.create({ data: { id: campaignId, handle, name: 'Audience test', campaignOwnerUserId: ownerId,
      discoverability: 'private', members: { create: [{ userId: ownerId, role: 'GAMEMASTER' }, { userId: playerId, role: 'PARTICIPANT' }] },
      wikiPages: { create: [
        { title: 'Quests', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'quests' } },
        { title: 'Narrative Threads', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'narrative_threads' } },
        { title: 'Public landmark', visibility: 'Public', blocks: [], metadata: {} },
        { title: 'Party landmark', visibility: 'Party', blocks: [], metadata: {} },
        { title: 'Hidden landmark', visibility: 'DM_Only', blocks: [], metadata: {} },
      ] } } });
    const cookies = new Map<string, string>();
    for (const id of ids) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      cookies.set(id, `${env.cookieName}=${await signAuthTokenForUser(user)}`);
    }
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api/campaigns/:campaignHandle', campaignScopedRouter);
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/campaigns/${handle}`;
    for (const path of ['/wiki/adventure-hub', '/wiki/quests-hub', '/wiki/threads-hub', '/adventure/storyboard', '/time-tracking']) {
      const response = await fetch(`${base}${path}?previewAsPlayer=true`, { headers: { cookie: cookies.get(ownerId)! } });
      assert.equal(response.status, 503, path);
    }
    const playerTree = await fetch(`${base}/wiki/tree`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerTree.status, 200);
    const treeText = await playerTree.text();
    assert.match(treeText, /Party landmark/);
    assert.doesNotMatch(treeText, /Hidden landmark/);
    const outsider = await fetch(`${base}/wiki/adventure-hub?previewAsPlayer=true`, { headers: { cookie: cookies.get(outsiderId)! } });
    assert.ok([401, 403, 404].includes(outsider.status));
    const anonymous = await fetch(`${base}/wiki/adventure-hub?previewAsPlayer=true`);
    assert.ok([401, 403, 404].includes(anonymous.status));
    const playerLayout = await fetch(`${base}/adventure/storyboard`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerLayout.status, 403);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
