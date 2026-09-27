import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { signAuthTokenForUser } from '../middleware/auth.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import { campaignScopedRouter } from './campaignScoped.js';

test('wiki mutation APIs advance the tree change marker for content and metadata', async (t) => {
  if (!process.env.TEST_DATABASE_URL) {
    t.skip('TEST_DATABASE_URL is required');
    return;
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  const suffix = `${process.pid}-${Date.now()}`;
  const userId = `wiki-updated-at-user-${suffix}`;
  const campaignId = `wiki-updated-at-campaign-${suffix}`;
  const pageId = `wiki-updated-at-page-${suffix}`;
  const handle = `wiki-updated-at-${suffix}`;
  let server: ReturnType<typeof createServer> | undefined;

  try {
    await prisma.user.create({ data: { id: userId, email: `${userId}@example.invalid` } });
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Wiki updatedAt regression',
        handle,
        campaignOwnerUserId: userId,
        members: { create: { userId, role: CampaignMemberRoles.GAMEMASTER } },
        wikiPages: {
          create: {
            id: pageId,
            title: 'The Glass Archive',
            visibility: WikiVisibility.PUBLIC,
            blocks: [],
            metadata: {},
          },
        },
      },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const token = await signAuthTokenForUser(user);
    const headers = {
      cookie: `${env.cookieName}=${token}`,
      'content-type': 'application/json',
    };

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/campaigns/:campaignHandle', campaignScopedRouter);
    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}/api/campaigns/${handle}`;

    // Let lazy system-page maintenance settle, then establish an unambiguous cursor.
    assert.equal((await fetch(`${baseUrl}/wiki/tree`, { headers })).status, 200);
    const baseline = new Date('2001-01-01T00:00:00.000Z');
    await prisma.wikiPage.updateMany({ where: { campaignId }, data: { updatedAt: baseline } });

    const layoutResponse = await fetch(`${baseUrl}/wiki/${pageId}/layout`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        blocks: [{ type: 'paragraph', content: 'A newly found passage.' }],
        temporal: {
          provenance: 'import',
          preserveTemporalHistory: true,
          metadata: { updatedAt: '1999-01-01T00:00:00.000Z' },
        },
      }),
    });
    assert.equal(layoutResponse.status, 200, await layoutResponse.text());

    const afterLayout = await prisma.wikiPage.findUniqueOrThrow({
      where: { id: pageId },
      select: { updatedAt: true },
    });
    assert.ok(afterLayout.updatedAt > baseline);

    const metadataResponse = await fetch(`${baseUrl}/wiki/${pageId}/metadata`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ key: 'Custodian', value: 'Mara Vey' }),
    });
    assert.equal(metadataResponse.status, 200, await metadataResponse.text());
    const afterMetadata = await prisma.wikiPage.findUniqueOrThrow({
      where: { id: pageId },
      select: { updatedAt: true },
    });
    assert.ok(afterMetadata.updatedAt > baseline);

    await prisma.wikiPage.update({ where: { id: pageId }, data: { updatedAt: baseline } });
    const aliasResponse = await fetch(`${baseUrl}/wiki/${pageId}/aliases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ alias: 'Archive of Glass' }),
    });
    assert.equal(aliasResponse.status, 201, await aliasResponse.text());

    const afterAlias = await prisma.wikiPage.findUniqueOrThrow({
      where: { id: pageId },
      select: { updatedAt: true },
    });
    assert.ok(afterAlias.updatedAt > baseline);

    const treeResponse = await fetch(`${baseUrl}/wiki/tree`, { headers });
    assert.equal(treeResponse.status, 200);
    const tree = (await treeResponse.json()) as { campaign: { updatedAt: string } };
    assert.ok(new Date(tree.campaign.updatedAt) >= afterAlias.updatedAt);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
});
