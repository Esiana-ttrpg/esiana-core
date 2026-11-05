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
  const ids = ['owner', 'player', 'outsider', 'writer'].map(name => `${name}-${stamp}`);
  const [ownerId, playerId, outsiderId, writerId] = ids;
  const campaignId = `audience-${stamp}`;
  const handle = `audience-${stamp}`;
  const questsId = `quests-${stamp}`;
  const threadsId = `threads-${stamp}`;
  const secretPageId = `secret-${stamp}`;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    for (const id of ids) await prisma.user.create({ data: { id, email: `${id}@example.invalid` } });
    await prisma.campaign.create({ data: { id: campaignId, handle, name: 'Audience test', campaignOwnerUserId: ownerId,
      discoverability: 'private', members: { create: [{ userId: ownerId, role: 'GAMEMASTER' },
        { userId: playerId, role: 'PARTICIPANT' }, { userId: writerId, role: 'WRITER' }] },
      wikiPages: { create: [
        { id: questsId, title: 'Quests', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'quests' } },
        { id: threadsId, title: 'Narrative Threads', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'narrative_threads' } },
        { title: 'Public landmark', visibility: 'Public', blocks: [], metadata: {} },
        { title: 'Party landmark', visibility: 'Party', blocks: [], metadata: {} },
        { id: secretPageId, title: 'Hidden landmark', visibility: 'DM_Only', blocks: [], metadata: {} },
      ] } } });
    for (const [title, parentId, visibility, metadata] of [
      ['Shared quest', questsId, 'Party', { questStatus: 'ACTIVE' }],
      ['Hidden quest sentinel', questsId, 'DM_Only', { questStatus: 'ACTIVE' }],
      ['Shared thread', threadsId, 'Party', { threadKind: 'mystery', threadStatus: 'OPEN' }],
      ['Hidden thread sentinel', threadsId, 'DM_Only', { threadKind: 'mystery', threadStatus: 'OPEN' }],
    ] as const) {
      await prisma.wikiPage.create({ data: { campaignId, title, parentId, visibility, blocks: [], metadata } });
    }
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
    for (const path of ['/wiki/adventure-hub', `/wiki/adventure-hub/${questsId}`, '/wiki/quests-hub',
      `/wiki/quests-hub/${questsId}`, '/wiki/threads-hub', `/wiki/threads-hub/${threadsId}`,
      '/adventure/storyboard', '/time-tracking', '/wiki/tree', `/wiki/${secretPageId}`,
      `/wiki/character-hub/${secretPageId}`]) {
      for (const id of [ownerId, writerId]) {
        const response = await fetch(`${base}${path}?previewAsPlayer=true`, { headers: { cookie: cookies.get(id)! } });
        assert.equal(response.status, 503, `${id}: ${path}`);
      }
    }
    const gmTree = await fetch(`${base}/wiki/tree`, { headers: { cookie: cookies.get(ownerId)! } });
    assert.equal(gmTree.status, 200);
    assert.match(await gmTree.text(), /Hidden landmark/);
    const playerTree = await fetch(`${base}/wiki/tree`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerTree.status, 200);
    const treeText = await playerTree.text();
    assert.match(treeText, /Party landmark/);
    assert.doesNotMatch(treeText, /Hidden landmark/);
    const deniedPage = await fetch(`${base}/wiki/${secretPageId}?previewAsPlayer=true`, { headers: { cookie: cookies.get(playerId)! } });
    assert.ok([403, 404].includes(deniedPage.status));
    assert.doesNotMatch(await deniedPage.text(), /Hidden landmark/);
    for (const [path, shared, hidden] of [
      ['/wiki/quests-hub', 'Shared quest', 'Hidden quest sentinel'],
      ['/wiki/threads-hub', 'Shared thread', 'Hidden thread sentinel'],
    ]) {
      const response = await fetch(`${base}${path}?previewAsPlayer=true`, { headers: { cookie: cookies.get(playerId)! } });
      assert.equal(response.status, 200, path);
      const body = await response.text();
      assert.match(body, new RegExp(shared));
      assert.doesNotMatch(body, new RegExp(hidden));
    }
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
