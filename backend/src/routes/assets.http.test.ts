import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import test from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { env } from '../config/env.js';
import { hashApiToken } from '../lib/apiToken.js';
import { prisma } from '../lib/prisma.js';
import { bootstrapStorageRegistry } from '../lib/storage/storageRegistry.js';
import { signAuthTokenForUser } from '../middleware/auth.js';
import { AssetTypes, CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import { assetsRouter } from './assets.js';

test('asset HTTP authorization treats session and bearer identities equivalently', async () => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  const suffix = `${process.pid}-${Date.now()}`;
  const memberId = `asset-http-member-${suffix}`;
  const outsiderId = `asset-http-outsider-${suffix}`;
  const campaignId = `asset-http-campaign-${suffix}`;
  const protectedAssetId = `asset-http-protected-${suffix}`;
  const hiddenAssetId = `asset-http-hidden-${suffix}`;
  const publicAssetId = `asset-http-public-${suffix}`;
  const filename = `asset-http-${suffix}.txt`;
  const filePath = `${env.uploadsDir}/${filename}`;
  const memberToken = `member-token-${suffix}`;
  const outsiderToken = `outsider-token-${suffix}`;
  const revokedToken = `revoked-token-${suffix}`;
  let server: ReturnType<typeof createServer> | undefined;

  try {
    await fs.promises.mkdir(env.uploadsDir, { recursive: true });
    await fs.promises.writeFile(filePath, 'asset authorization fixture');

    await prisma.user.createMany({
      data: [
        { id: memberId, email: `${memberId}@example.invalid` },
        { id: outsiderId, email: `${outsiderId}@example.invalid` },
      ],
    });
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Asset HTTP authorization',
        handle: `asset-http-${suffix}`,
        campaignOwnerUserId: memberId,
        discoverability: 'public',
        members: {
          create: { userId: memberId, role: CampaignMemberRoles.PARTICIPANT },
        },
        assets: {
          create: [
            {
              id: protectedAssetId,
              url: `/uploads/${filename}`,
              type: AssetTypes.MAP,
              visibility: WikiVisibility.PARTY,
            },
            {
              id: hiddenAssetId,
              url: `/uploads/${filename}`,
              type: AssetTypes.MAP,
              visibility: WikiVisibility.DM_ONLY,
            },
            {
              id: publicAssetId,
              url: `/uploads/${filename}`,
              type: AssetTypes.MAP,
              visibility: WikiVisibility.PUBLIC,
            },
          ],
        },
      },
    });
    await prisma.userToken.createMany({
      data: [
        {
          userId: memberId,
          name: 'Asset regression member',
          tokenHash: hashApiToken(memberToken),
          expiresAt: new Date(Date.now() + 60_000),
          scopes: ['campaign:read'],
        },
        {
          userId: outsiderId,
          name: 'Asset regression outsider',
          tokenHash: hashApiToken(outsiderToken),
          expiresAt: new Date(Date.now() + 60_000),
          scopes: ['campaign:read'],
        },
      ],
    });

    const app = express();
    app.use(cookieParser());
    app.use('/api/assets', assetsRouter);
    bootstrapStorageRegistry();
    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}/api/assets`;

    const member = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    const sessionToken = await signAuthTokenForUser(member);
    const sessionHeaders = { cookie: `${env.cookieName}=${sessionToken}` };
    const memberBearerHeaders = { authorization: `Bearer ${memberToken}` };

    const sessionResponse = await fetch(`${baseUrl}/${protectedAssetId}`, {
      headers: sessionHeaders,
    });
    assert.equal(sessionResponse.status, 200);
    assert.equal(await sessionResponse.text(), 'asset authorization fixture');

    const bearerResponse = await fetch(`${baseUrl}/${protectedAssetId}`, {
      headers: memberBearerHeaders,
    });
    assert.equal(bearerResponse.status, 200);
    assert.equal(await bearerResponse.text(), 'asset authorization fixture');

    const outsiderResponse = await fetch(`${baseUrl}/${protectedAssetId}`, {
      headers: { authorization: `Bearer ${outsiderToken}` },
    });
    assert.equal(outsiderResponse.status, 404);

    for (const headers of [sessionHeaders, memberBearerHeaders]) {
      const response = await fetch(`${baseUrl}/${hiddenAssetId}`, { headers });
      assert.equal(response.status, 404);
    }

    const anonymousPublicResponse = await fetch(`${baseUrl}/${publicAssetId}`);
    assert.equal(anonymousPublicResponse.status, 200);
    assert.equal(await anonymousPublicResponse.text(), 'asset authorization fixture');

    const anonymousProtectedResponse = await fetch(`${baseUrl}/${protectedAssetId}`);
    assert.equal(anonymousProtectedResponse.status, 404);

    const invalidResponse = await fetch(`${baseUrl}/${protectedAssetId}`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(invalidResponse.status, 401);

    await prisma.userToken.deleteMany({
      where: { tokenHash: hashApiToken(memberToken) },
    });
    const revokedResponse = await fetch(`${baseUrl}/${protectedAssetId}`, {
      headers: { authorization: `Bearer ${memberToken}` },
    });
    assert.equal(revokedResponse.status, 401);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { id: { in: [memberId, outsiderId] } } });
    await fs.promises.rm(filePath, { force: true });
  }
});
