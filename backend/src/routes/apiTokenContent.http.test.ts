import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { env } from '../config/env.js';
import { hashApiToken } from '../lib/apiToken.js';
import { prisma } from '../lib/prisma.js';
import { signAuthTokenForUser } from '../middleware/auth.js';
import { campaignScopedRouter } from './campaignScoped.js';
import { calendarRouter } from './calendar.js';
import { userRouter } from './user.js';
import { usersPublicRouter } from './usersPublic.js';
import { WikiVisibility } from '../types/domain.js';

test('tokens and sessions expose the same authorized page, character profile, and session content',
  { skip: process.env.API_TOKEN_CONTENT_TEST_DATABASE !== '1' }, async (t) => {
  const stamp = randomUUID();
  const member = await prisma.user.create({ data: { email: `token-content-${stamp}@example.invalid` } });
  const outsider = await prisma.user.create({ data: { email: `token-outsider-${stamp}@example.invalid` } });
  const campaign = await prisma.campaign.create({ data: {
    name: 'The Glass Archive', handle: `token-content-${stamp}`, campaignOwnerUserId: outsider.id,
    members: { create: { userId: member.id, role: 'PARTICIPANT' } },
  } });
  const blocks = [{ id: 'description', type: 'text', content: { markdown: 'Neris discovers a hidden passage.' } }];
  const page = await prisma.wikiPage.create({ data: {
    campaignId: campaign.id, title: 'The Glass Archive', blocks, visibility: WikiVisibility.PARTY,
    metadata: { description: 'A library of campaign memories.' },
  } });
  const character = await prisma.wikiPage.create({ data: {
    campaignId: campaign.id, title: 'Neris', blocks, visibility: WikiVisibility.PARTY,
    metadata: { entityCategory: 'characters', description: 'An explorer of forgotten stories.' },
  } });
  const hidden = await prisma.wikiPage.create({ data: {
    campaignId: campaign.id, title: 'Unrevealed history', blocks, visibility: WikiVisibility.DM_ONLY,
  } });
  const portfolio = await prisma.portfolioCharacter.create({ data: {
    userId: member.id, name: 'Neris', biography: 'Their adventures began in the archive.',
  } });
  const otherPortfolio = await prisma.portfolioCharacter.create({ data: { userId: outsider.id, name: 'Mara' } });
  const mediaPath = path.join(env.uploadsDir, `token-content-${stamp}.txt`);
  await fs.mkdir(env.uploadsDir, { recursive: true });
  await fs.writeFile(mediaPath, 'Portrait fixture');
  const asset = await prisma.userAsset.create({ data: {
    userId: member.id, url: `/uploads/${path.basename(mediaPath)}`,
  } });
  const timeline = await prisma.campaignSessionTimeline.create({ data: {
    campaignId: campaign.id, wikiPageId: page.id, authorId: member.id, sequenceOrder: 1,
    schedule: { create: { status: 'PUBLISHED', plannedStartAt: new Date('2026-10-28T18:00:00Z') } },
  } });
  const issue = async (userId: string, scopes: string[]) => {
    const raw = randomUUID();
    await prisma.userToken.create({ data: {
      userId, name: 'Content regression', tokenHash: hashApiToken(raw), scopes,
      expiresAt: new Date(Date.now() + 3600000),
    } });
    return { authorization: `Bearer ${raw}` };
  };
  const bearer = await issue(member.id, ['campaign:read']);
  const writer = await issue(member.id, ['campaign:read', 'campaign:write']);
  const legacy = await issue(member.id, []);
  const wrongScope = await issue(member.id, ['plugins:read']);
  const stranger = await issue(outsider.id, ['campaign:read']);
  const session = { cookie: `${env.cookieName}=${await signAuthTokenForUser(member)}` };
  const app = express();
  app.use(express.json()); app.use(cookieParser());
  app.use('/api/user', userRouter); app.use('/api/users', usersPublicRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/campaigns/:campaignHandle', campaignScopedRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = (path: string, headers: Record<string, string>, method = 'GET', body?: unknown) =>
    fetch(`${origin}${path}`, { method, headers: { ...headers, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  const json = async (path: string, headers: Record<string, string>) => {
    const response = await request(path, headers);
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  };
  const base = `/api/campaigns/${campaign.handle}`;
  try {
    await t.test('wiki and character details retain descriptions and body blocks', async () => {
      for (const fixture of [page, character]) {
        const path = `${base}/wiki/${fixture.id}`;
        const normal = await json(path, session);
        assert.equal(normal.blocks[0].content.markdown, blocks[0].content.markdown);
        assert.ok(normal.metadata.description);
        assert.deepEqual(await json(path, bearer), normal);
      }
      for (const headers of [session, bearer]) {
        assert.equal((await request(`${base}/wiki/${hidden.id}`, headers)).status, 403);
        assert.equal((await request(`${base}/wiki/${otherPortfolio.id}`, headers)).status, 404);
      }
      assert.equal((await request(`${base}/wiki/${page.id}`, stranger)).status, 403);
      const tabs = `${base}/wiki/${character.id}/character-pages`;
      assert.deepEqual(await json(tabs, bearer), await json(tabs, session));
    });
    await t.test('portfolio list/detail and private character profile resolve the token owner', async () => {
      for (const path of ['/api/user/portfolio/characters', `/api/user/portfolio/characters/${portfolio.id}`,
        `/api/users/${member.id}/characters/${portfolio.id}`]) {
        const normal = await json(path, session);
        assert.deepEqual(await json(path, bearer), normal);
        assert.deepEqual(await json(path, legacy), normal);
        assert.equal((await request(path, wrongScope)).status, 403);
      }
      assert.equal((await json(`/api/user/portfolio/characters/${portfolio.id}`, bearer)).character.biography, portfolio.biography);
      assert.equal((await request(`/api/user/portfolio/characters/${otherPortfolio.id}`, bearer)).status, 404);
      assert.equal((await request(`/api/users/${member.id}/characters/${portfolio.id}`, stranger)).status, 404);
      assert.equal((await request(`/api/users/${member.id}/characters/${portfolio.id}`, {})).status, 404);
      const mediaUrl = `/api/users/assets/${asset.id}`;
      for (const headers of [session, bearer]) {
        const response = await request(mediaUrl, headers);
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'Portrait fixture');
      }
      assert.equal((await request(mediaUrl, stranger)).status, 404);
      assert.equal((await request(mediaUrl, {})).status, 404);
      assert.equal((await request(mediaUrl, wrongScope)).status, 403);
    });
    await t.test('My Sessions schedule and calendar return populated, matching results', async () => {
      const schedulePath = '/api/user/schedule?from=2026-10-01&to=2026-10-31';
      const schedule = await json(schedulePath, session);
      assert.ok(schedule.entries.some((entry: { timelinePointId: string }) => entry.timelinePointId === timeline.id));
      assert.deepEqual(await json(schedulePath, bearer), schedule);
      assert.deepEqual(await json(schedulePath, legacy), schedule);
      assert.equal((await request(schedulePath, wrongScope)).status, 403);
      const calendarPath = '/api/calendar/sessions?from=2026-10-01&to=2026-10-31';
      assert.deepEqual(await json(calendarPath, bearer), await json(calendarPath, session));
      assert.deepEqual((await json(schedulePath, stranger)).entries, []);
    });
    await t.test('read scopes cannot write and account security remains session-only', async () => {
      const path = `/api/user/portfolio/characters/${portfolio.id}`;
      assert.equal((await request(path, bearer, 'PATCH', { biography: 'Changed' })).status, 403);
      assert.equal((await request(path, writer, 'PATCH', { biography: 'A new discovery.' })).status, 200);
      assert.equal((await request('/api/user/schedule/preferences', bearer, 'PATCH', { autoRsvpEnabled: false })).status, 403);
      assert.equal((await request('/api/user/schedule/preferences', writer, 'PATCH', { autoRsvpEnabled: false })).status, 200);
      assert.equal((await request('/api/user/tokens', writer)).status, 401);
      assert.equal((await request('/api/user/portfolio/characters', {})).status, 401);
      assert.equal((await request('/api/user/portfolio/characters', { authorization: 'Bearer invalid' })).status, 401);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.user.deleteMany({ where: { id: { in: [member.id, outsider.id] } } });
    await fs.rm(mediaPath, { force: true });
    await prisma.$disconnect();
  }
});
