import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { signAuthTokenForUser } from '../middleware/auth.js';
import { opdsRouter } from './opds.js';
import { userRouter } from './user.js';
import { adminRouter } from './admin.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';

test('OPDS route controls, audience authorization and credential lifecycle', { skip: process.env.OPDS_TEST_DATABASE !== '1' }, async () => {
  const admin = await prisma.user.create({ data: { email: 'opds-admin@example.invalid', role: 'SYSTEM_ADMIN' } });
  const member = await prisma.user.create({ data: { email: 'opds-party@example.invalid' } });
  const outsider = await prisma.user.create({ data: { email: 'opds-outsider@example.invalid' } });
  const campaign = await prisma.campaign.create({ data: { name: 'The Glass Archive', handle: 'opds-glass',
    campaignOwnerUserId: admin.id, discoverability: 'public', isLookingForGroup: true,
    recruitmentTagline: 'Explore forgotten stories', recruitmentPremise: '## Join our expedition',
    members: { create: [{ userId: admin.id, role: 'GAMEMASTER' }, { userId: member.id, role: 'PARTICIPANT' }] } } });
  const makePage = (title: string, visibility: string) => prisma.wikiPage.create({ data: { campaignId: campaign.id, title,
    workspace: 'wiki', visibility, metadata: { description: `${title} description` }, blocks: [
      { id: 'lore', type: 'text-tiptap', visibility, content: { markdown: `## Lore\n\n**${title} full lore**` } },
      { id: 'secret-block', type: 'text-tiptap', visibility: 'DM_Only', content: { markdown: 'SECRET BLOCK' } },
    ] } });
  const publicPage = await makePage('Elara', 'Public');
  const partyPage = await makePage('Neris', 'Party');
  const gmPage = await makePage('Hidden archive', 'DM_Only');
  const unrevealed = await makePage('Unrevealed', 'Party');
  await prisma.contentPresenceState.create({ data: { campaignId: campaign.id, entityType: ContentPresenceEntityType.WIKI_PAGE,
    entityId: unrevealed.id, state: 'HIDDEN' } });
  const otherCampaign = await prisma.campaign.create({ data: { name: 'Other campaign', handle: 'opds-other', campaignOwnerUserId: outsider.id } });
  const foreignPage = await prisma.wikiPage.create({ data: { campaignId: otherCampaign.id, title: 'Foreign lore', visibility: 'Public' } });
  await prisma.systemSetting.upsert({ where: { id: 'GLOBAL_CONFIG' }, create: { id: 'GLOBAL_CONFIG' }, update: {} });
  const app = express(); app.use(express.json()); app.use(cookieParser());
  app.use('/opds', opdsRouter); app.use('/api/user', userRouter); app.use('/api/admin', adminRouter);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const session = async (user: typeof member) => ({ cookie: `${env.cookieName}=${await signAuthTokenForUser(user)}` });
  const adminHeaders = await session(admin); const memberHeaders = await session(member);
  const request = (path: string, headers: Record<string, string> = {}, method = 'GET', body?: unknown) => fetch(origin + path,
    { headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, method, body: body ? JSON.stringify(body) : undefined });
  const settings = (data: object) => prisma.systemSetting.update({ where: { id: 'GLOBAL_CONFIG' }, data });
  const issue = async (headers: Record<string, string>) => {
    const result = await request('/api/user/opds/credentials', headers, 'POST', { name: 'Tablet Reader' });
    assert.equal(result.status, 201); return result.json() as Promise<{ secret: string; credential: { id: string } }>;
  };
  try {
    assert.equal((await request('/opds')).status, 404);
    await settings({ opdsEnabled: true, opdsPersonalEnabled: true, opdsPublicEnabled: true, opdsCampaignsEnabled: true, opdsRecruitingEnabled: true, requireLogin: false });
    assert.equal((await request('/opds/me')).status, 401);
    const party = await issue(memberHeaders); const gm = await issue(adminHeaders); const stranger = await issue(await session(outsider));
    assert.equal((await request('/api/admin/opds/credentials', memberHeaders)).status, 403);
    assert.equal((await request(`/api/user/opds/credentials/${gm.credential.id}`, memberHeaders, 'DELETE')).status, 404);
    const bearer = { authorization: `Bearer ${party.secret}` };
    const gmBearer = { authorization: `Bearer ${gm.secret}` };
    const basic = { authorization: `Basic ${Buffer.from(`reader:${party.secret}`).toString('base64')}` };
    assert.equal((await request('/opds/me', basic)).status, 200);
    assert.equal((await request('/opds/me/', basic)).status, 200);
    const apiTokenResponse = await request('/api/user/tokens', memberHeaders, 'POST', { name: 'Ordinary API key', durationDays: 30, scopes: ['campaign:read'] });
    assert.equal(apiTokenResponse.status, 201);
    const apiToken = await apiTokenResponse.json();
    assert.equal(typeof apiToken.secret, 'string');
    assert.ok(apiToken.secret.length > 0);
    assert.equal((await request('/opds/me', { authorization: `Bearer ${apiToken.secret}` })).status, 401, 'ordinary API keys are not reader credentials');
    await prisma.userToken.delete({ where: { id: apiToken.token.id } });
    assert.equal((await request('/api/user/schedule', bearer)).status, 401, 'OPDS secret must not authenticate general APIs');
    const root = await (await request('/opds')).json(); assert.equal(root.navigation.length, 3);
    const catalog = await (await request('/opds/me', bearer)).json(); assert.equal(catalog.navigation[0].title, campaign.name);
    const module = await (await request(`/opds/me/${campaign.id}/wiki`, bearer)).json();
    assert.deepEqual(module.publications.map((p: any) => p.metadata.title).sort(), ['Elara', 'Neris']);
    const publicModule = await (await request(`/opds/campaigns/${campaign.id}/wiki`)).json();
    assert.deepEqual(publicModule.publications.map((p: any) => p.metadata.title).sort(), ['Elara', 'Neris'], 'public campaigns expose the existing Observer-eligible projection');
    const resource = `/opds/me/${campaign.id}/pages/${partyPage.id}`;
    const html = await (await request(resource, bearer)).text();
    assert.match(html, /<strong>Neris full lore<\/strong>/); assert.doesNotMatch(html, /SECRET BLOCK/);
    const manifest = await (await request(resource + '/manifest.json', bearer)).json();
    assert.equal(manifest.readingOrder[0].href, resource);
    const freshResource = await request(resource, bearer);
    const etag = freshResource.headers.get('etag'); assert.ok(etag);
    assert.equal((await fetch(origin + resource, { headers: { ...bearer, 'if-none-match': etag }, cache: 'force-cache' })).status, 304);
    await settings({ opdsPersonalEnabled: false });
    assert.equal((await request(resource, bearer)).status, 404);
    assert.equal((await request(resource + '/manifest.json', bearer)).status, 404);
    assert.equal((await request('/api/user/opds/credentials', memberHeaders, 'POST', { name: 'Disabled Reader' })).status, 403);
    await settings({ opdsPersonalEnabled: true, requireLogin: true });
    assert.equal((await request('/opds')).status, 404);
    assert.equal((await request(resource, bearer)).status, 200);
    await settings({ requireLogin: false });
    for (const id of [gmPage.id, unrevealed.id, foreignPage.id]) {
      assert.equal((await request(`/opds/me/${campaign.id}/pages/${id}`, bearer)).status, 404);
      assert.equal((await request(`/opds/campaigns/${campaign.id}/pages/${id}`)).status, 404);
    }
    assert.equal((await request(`/opds/me/${campaign.id}/pages/${gmPage.id}`, gmBearer)).status, 200);
    assert.equal((await request(`/opds/me/${campaign.id}`, { authorization: `Bearer ${stranger.secret}` })).status, 404);
    assert.equal((await request(`/opds/campaigns/${campaign.id}/pages/${partyPage.id}`)).status, 200);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { discoverability: 'private' } });
    assert.equal((await request(`/opds/campaigns/${campaign.id}/pages/${partyPage.id}`)).status, 404);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { discoverability: 'public' } });
    assert.equal((await request(`/opds/campaigns/${campaign.id}/pages/${publicPage.id}`)).status, 200);
    assert.match(JSON.stringify(await (await request('/opds/recruiting')).json()), /Explore forgotten stories/);
    assert.match(await (await request(`/opds/recruiting/${campaign.id}`)).text(), /Join our expedition/);
    await settings({ opdsRecruitingEnabled: false }); assert.equal((await request('/opds/recruiting')).status, 404);
    await settings({ opdsCampaignsEnabled: false }); assert.equal((await request(`/opds/campaigns/${campaign.id}/pages/${publicPage.id}`)).status, 404);
    assert.equal((await request(`/opds/CAMPAIGNS/${campaign.id}/pages/${publicPage.id}`)).status, 404);
    assert.equal((await request(resource, bearer)).status, 200, 'personal setting is independent');
    await settings({ opdsPublicEnabled: false }); assert.equal((await request('/opds')).status, 404);
    assert.equal((await request('/opds/me', bearer)).status, 200);
    await settings({ opdsEnabled: false }); assert.equal((await request(resource, bearer)).status, 404);
    await settings({ opdsEnabled: true }); assert.equal((await request(resource, bearer)).status, 200);
    await prisma.campaignMember.delete({ where: { userId_campaignId: { userId: member.id, campaignId: campaign.id } } });
    assert.equal((await request(resource, bearer)).status, 404);
    await prisma.campaignMember.create({ data: { userId: member.id, campaignId: campaign.id, role: 'PARTICIPANT' } });
    assert.equal((await request(`/api/user/opds/credentials/${party.credential.id}`, memberHeaders, 'DELETE')).status, 200);
    assert.equal((await request('/opds/me', bearer)).status, 401);
    const adminRevoke = await issue(memberHeaders);
    const listed = await (await request(`/api/admin/users/${member.id}/opds/credentials`, adminHeaders)).json();
    assert.ok(listed.credentials.length); assert.doesNotMatch(JSON.stringify(listed), /tokenHash|secret/);
    assert.equal((await request(`/api/admin/users/${member.id}/opds/credentials/${adminRevoke.credential.id}`, adminHeaders, 'DELETE')).status, 200);
    assert.equal((await request('/opds/me', { authorization: `Bearer ${adminRevoke.secret}` })).status, 401);
    const bulkFirst = await issue(memberHeaders); const bulkSecond = await issue(memberHeaders);
    assert.equal((await request('/api/user/opds/credentials', memberHeaders, 'DELETE', { confirmation: 'REVOKE ALL OPDS CREDENTIALS' })).status, 200);
    for (const credential of [bulkFirst, bulkSecond]) {
      assert.equal((await request('/opds/me', { authorization: `Bearer ${credential.secret}` })).status, 401);
    }
    assert.equal((await request('/opds/me', gmBearer)).status, 200, 'user bulk revocation cannot affect another user');
    await issue(memberHeaders);
    await request(`/api/admin/users/${member.id}/opds/credentials`, adminHeaders, 'DELETE');
    assert.equal(await prisma.userToken.count({ where: { userId: member.id } }), 0);
    assert.equal((await request('/api/admin/opds/credentials', adminHeaders, 'DELETE')).status, 400);
    await request('/api/admin/opds/credentials', adminHeaders, 'DELETE', { confirmation: 'REVOKE ALL OPDS CREDENTIALS' });
    assert.equal((await request('/opds/me', gmBearer)).status, 401);
    assert.equal(await prisma.opdsAuditLog.count({ where: { action: 'REVOKE_ALL' } }), 1);
    const deletedUser = await issue(memberHeaders);
    assert.equal((await request('/api/user/account', memberHeaders, 'DELETE')).status, 200);
    assert.equal(await prisma.userToken.count({ where: { userId: member.id } }), 0);
    assert.equal((await request('/opds/me', { authorization: `Bearer ${deletedUser.secret}` })).status, 401);
    const victim = await prisma.user.create({ data: { email: 'opds-deleted@example.invalid' } });
    const victimSecret = await issue(await session(victim));
    assert.equal((await request(`/api/admin/users/${victim.id}`, adminHeaders, 'DELETE')).status, 200);
    assert.equal((await request('/opds/me', { authorization: `Bearer ${victimSecret.secret}` })).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
