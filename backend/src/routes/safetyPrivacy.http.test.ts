import { deleteCampaign } from '../controllers/campaignsController.js';
import { deleteAdminCampaign } from '../controllers/adminCampaignsController.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { signAuthTokenForUser } from '../middleware/auth.js';
import { safetyPrivacyRouter } from './safetyPrivacy.js';
import { removeCampaignMember, leaveCampaign } from '../controllers/campaignAccessController.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';

test('private request lifecycle, notifications, former members and recording discovery', { skip: process.env.SESSION_AUDIO_TEST_DATABASE !== '1' }, async () => {
 const stamp = randomUUID();
 const users = await Promise.all(['Sable','Mira','Juniper','Neris','Aster'].map(displayName => prisma.user.create({ data: { displayName, email: displayName + stamp + '@example.invalid', role: displayName === 'Aster' ? 'SYSTEM_ADMIN' : 'USER' } })));
 const [owner, player, writer, observer, globalAdmin] = users;
 const campaign = await prisma.campaign.create({ data: { name: 'Florence', handle: 'safety-' + stamp, campaignOwnerUserId: owner.id, members: { create: [ { userId: owner.id, role: 'GAMEMASTER' }, { userId: player.id, role: 'PARTICIPANT' }, { userId: writer.id, role: 'WRITER' }, { userId: observer.id, role: 'OBSERVER' } ] } } });
 const other = await prisma.campaign.create({ data: { name: 'Elsewhere', handle: 'elsewhere-' + stamp, campaignOwnerUserId: globalAdmin.id, members: { create: { userId: globalAdmin.id, role: 'GAMEMASTER' } } } });
 const app = express(); app.use(express.json(), cookieParser()); app.use('/api/safety-privacy', safetyPrivacyRouter);
 const server = createServer(app); await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
 const origin = 'http://127.0.0.1:' + (server.address() as {port: number}).port + '/api/safety-privacy';
 const cookies = new Map(await Promise.all(users.map(async u => [u.id, env.cookieName + '=' + await signAuthTokenForUser(u)] as const)));
 async function call(userId: string, path: string, method = 'GET', data?: unknown) {
  const r = await fetch(origin + path, { method, headers: { Cookie: cookies.get(userId)!, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: r.status, data: await r.json().catch(() => null) as any };
 }
 try {
  const recipients = await call(player.id, '/recipients/' + campaign.handle);
  assert.deepEqual(recipients.data.map((u: any) => u.id), [owner.id]);
  assert.equal(recipients.data[0].displayName, owner.displayName);
  const payload = { campaign: campaign.handle, category: 'recording_privacy', description: 'Sensitive private description', relatedContentType: 'recording', relatedContentId: 'unlisted-reference', recipientIds: [owner.id] };
  assert.equal((await call(player.id,'/requests','POST',{...payload,recipientIds:[]})).status,409);
  const created = await call(player.id,'/requests','POST',payload); assert.equal(created.status,201);
  const id = created.data.id, path = '/requests/' + id;
  const notifications = await prisma.notification.findMany({ where: { campaignId: campaign.id } });
  assert.equal(notifications.length,1); assert.equal(notifications[0].userId,owner.id);
  assert.ok(notifications[0].linkUrl?.includes(id)); assert.ok(!JSON.stringify(notifications).includes(payload.description));
  for (const u of [writer,observer,globalAdmin]) {
   assert.equal((await call(u.id,path)).status,404);
   assert.equal((await call(u.id,path + '/messages','POST',{body:'Intrusion'})).status,404);
   assert.equal((await call(u.id,'/requests?campaign=' + campaign.handle)).status,403);
  }
  let inbox = await call(owner.id,'/requests?campaign=' + campaign.handle); assert.equal(inbox.data[0].unread,true);
  let detail = await call(owner.id,path); assert.equal(detail.status,200);
  assert.deepEqual(detail.data.campaign, { id: campaign.id, handle: campaign.handle, name: campaign.name });
  assert.equal(detail.data.people.find((p: any) => p.id === player.id).displayName, player.displayName);
  for (const displayName of [null, '', '   ']) {
   await prisma.user.update({ where: { id: owner.id }, data: { displayName } });
   await prisma.user.update({ where: { id: player.id }, data: { displayName } });
   const neutralRecipients = await call(player.id, '/recipients/' + campaign.handle);
   assert.deepEqual(neutralRecipients.data, [{ id: owner.id, displayName: 'Campaign participant' }]);
   const neutralDetail = await call(owner.id, path);
   assert.equal(neutralDetail.status, 200);
   for (const person of neutralDetail.data.people) {
    assert.deepEqual(person, { id: person.id, displayName: 'Campaign participant' });
   }
   assert.ok(!JSON.stringify(neutralDetail.data.people).includes(stamp));
  }
  await prisma.user.update({ where: { id: owner.id }, data: { displayName: owner.displayName } });
  await prisma.user.update({ where: { id: player.id }, data: { displayName: player.displayName } });
  inbox = await call(owner.id,'/requests?campaign=' + campaign.handle); assert.equal(inbox.data[0].unread,false);
  assert.equal((await call(owner.id,path + '/status','PATCH',{status:'declined',expectedRevision:0})).status,400);
  assert.equal((await call(owner.id,path + '/status','PATCH',{status:'in_review',expectedRevision:0})).status,200);
  assert.equal((await call(owner.id,path + '/status','PATCH',{status:'resolved',reason:'Done',expectedRevision:0})).status,409);
  assert.equal((await call(owner.id,path + '/messages','POST',{body:'Private administrator reply'})).status,201);
  detail = await call(player.id,path); assert.equal(detail.data.messages[0].body,'Private administrator reply');
  assert.equal((await call(owner.id,path + '/status','PATCH',{status:'resolved',reason:'Access restricted using recording management.',expectedRevision:detail.data.revision})).status,200);
  detail = await call(player.id,path); assert.equal(detail.data.events.length,3); assert.ok(detail.data.resolvedAt);
  const response = { json: () => {}, status: () => response };
  await leaveCampaign({ campaign: { campaignId: campaign.id, campaignHandle: campaign.handle, isCampaignOwner: false }, user: { id: player.id } } as any, response as any);
  assert.ok(await prisma.safetyPrivacyEligibility.findUnique({where:{campaignId_userId:{campaignId:campaign.id,userId:player.id}}}));
  assert.equal((await call(player.id,path)).status,200);
  assert.equal((await call(player.id,path + '/messages','POST',{body:'Former member follow-up'})).status,201);
  detail = await call(player.id,path);
  assert.equal((await call(player.id,path + '/status','PATCH',{status:'open',expectedRevision:detail.data.revision})).status,200);
  assert.equal((await call(player.id,'/requests','POST',payload)).status,201);
  assert.equal((await call(player.id,'/requests','POST',{...payload,campaign:other.handle,recipientIds:[globalAdmin.id]})).status,404);
  // An observer with an explicit grant can review, and revocation takes effect immediately.
  await prisma.campaignRoleCapabilityOverride.create({ data: { campaignId: campaign.id, role:'OBSERVER', capability:C.SAFETY_MANAGE, effect:'GRANT' } });
  assert.equal((await call(observer.id,path)).status,200);
  await prisma.campaignRoleCapabilityOverride.deleteMany({ where: { campaignId: campaign.id } });
  assert.equal((await call(observer.id,path)).status,404);
  const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id,title:'Session 1',visibility:'Party',blocks:[] } });
  const timeline = await prisma.campaignSessionTimeline.create({ data: { campaignId:campaign.id,wikiPageId:page.id,authorId:owner.id,sequenceOrder:1,attendance:{create:{userId:observer.id,status:'ATTENDING'}} } });
  const recording = await prisma.sessionRecording.create({ data: { campaignId:campaign.id,timelineId:timeline.id,uploadedByUserId:owner.id,title:'Shared voices',visibility:'campaign' } });
  const hidden = await prisma.sessionRecording.create({ data: { campaignId:campaign.id,timelineId:timeline.id,uploadedByUserId:owner.id,title:'Private voices',visibility:'uploader_and_managers' } });
  let found = await call(observer.id,'/recordings'); assert.equal(found.status,200); assert.deepEqual(found.data.map((r:any)=>r.id),[recording.id]);
  await prisma.wikiPage.update({where:{id:page.id},data:{visibility:'DMOnly'}});
  found = await call(observer.id,'/recordings'); assert.deepEqual(found.data,[]);
  assert.equal((await prisma.sessionRecording.findUniqueOrThrow({where:{id:hidden.id}})).visibility,'uploader_and_managers');
  const notes = await prisma.notification.findMany({where:{campaignId:campaign.id}});
  assert.ok(notes.some(n=>n.userId===player.id)); assert.ok(notes.every(n=>!JSON.stringify(n).includes('Private administrator reply') && !JSON.stringify(n).includes('Former member follow-up')));
  await removeCampaignMember({ campaign: { campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id }, params: {userId:observer.id} } as any, response as any);
  assert.equal((await call(observer.id,'/requests','POST',payload)).status,201);
  assert.equal((await call(owner.id,path,'DELETE')).status,404);
  let deletionStatus = 0;
  const deletionResponse = { status: (value: number) => { deletionStatus = value; return deletionResponse; }, json: () => {} };
  await deleteCampaign({params:{id:campaign.handle}, user:{id:owner.id}} as any, deletionResponse as any);
  assert.equal(deletionStatus,409);
  await deleteAdminCampaign({params:{campaignId:campaign.id}, body:{confirmTitle:campaign.name}} as any, deletionResponse as any);
  assert.equal(deletionStatus,409);
  assert.ok(await prisma.sessionRecording.findUnique({where:{id:recording.id}}));
  await prisma.user.delete({where:{id:player.id}});
  detail = await call(owner.id,path);
  assert.equal(detail.status,200);
  assert.equal(detail.data.requesterId,player.id);
  assert.ok(detail.data.messages.some((m:any)=>m.body==='Former member follow-up'));
  assert.ok(!detail.data.people.some((p:any)=>p.id===player.id));
 } finally {
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await prisma.safetyPrivacyRequest.deleteMany({where:{campaignId:campaign.id}});
  await prisma.campaign.deleteMany({where:{id:{in:[campaign.id,other.id]}}});
  await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});
  await prisma.$disconnect();
 }
});
