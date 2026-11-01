import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { defaultJsonBody } from '../middleware/jsonBody.js';
import { prisma } from './prisma.js';
import { hashApiToken } from './apiToken.js';
import { audioSettings, campaignAudioSettings } from './audioCore.js';
import { bootstrapStorageRegistry } from './storage/storageRegistry.js';
import { campaignScopedRouter } from '../routes/campaignScoped.js';
import { assetsRouter } from '../routes/assets.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { CapabilityOverrideEffect } from '../../../shared/campaignPolicy/capabilityOverrides.js';
import { invalidateCampaignCapabilityOverrideCache } from './campaignScopeContext.js';
import { WikiVisibility } from '../types/domain.js';

test('external integrations complete the shared lifecycle with scoped bearer tokens and safe retries',
  { skip: process.env.SESSION_AUDIO_TEST_DATABASE !== '1' }, async (t) => {
  const stamp = randomUUID();
  const owner = await prisma.user.create({ data: { email: `external-owner-${stamp}@example.invalid` } });
  const uploader = await prisma.user.create({ data: { email: `external-uploader-${stamp}@example.invalid`, role: 'USER' } });
  const colleague = await prisma.user.create({ data: { email: `external-colleague-${stamp}@example.invalid`, role: 'USER' } });
  const outsider = await prisma.user.create({ data: { email: `external-outsider-${stamp}@example.invalid`, role: 'USER' } });
  const campaign = await prisma.campaign.create({ data: { name: 'External audio', handle: `external-${stamp}`, campaignOwnerUserId: owner.id,
    members: { create: [{ userId: owner.id, role: 'GAMEMASTER' }, { userId: uploader.id, role: 'PARTICIPANT' }, { userId: colleague.id, role: 'PARTICIPANT' }] } } });
  const other = await prisma.campaign.create({ data: { name: 'Other campaign', handle: `other-${stamp}`, campaignOwnerUserId: owner.id,
    members: { create: { userId: uploader.id, role: 'PARTICIPANT' } } } });
  const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Session 1', visibility: WikiVisibility.PARTY, blocks: [] } });
  const timeline = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: page.id, authorId: owner.id, sequenceOrder: 1 } });
  await audioSettings();
  await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { enabled: true } });
  assert.equal((await campaignAudioSettings(campaign.id)).enabled, true);
  for (const capability of [C.AUDIO_UPLOAD, C.AUDIO_CHAPTERS_EDIT, C.AUDIO_TRANSCRIPT_EDIT, C.AUDIO_TRANSCRIPT_PUBLISH]) {
    await prisma.campaignRoleCapabilityOverride.create({ data: { campaignId: campaign.id, role: 'PARTICIPANT', capability, effect: CapabilityOverrideEffect.GRANT } });
  }
  const issue = async (userId: string, scopes: string[]) => {
    const raw = randomUUID();
    const record = await prisma.userToken.create({ data: { userId, name: 'External audio fixture', tokenHash: hashApiToken(raw), scopes,
      expiresAt: new Date(Date.now() + 3600000) } });
    return { raw, id: record.id };
  };
  const writer = await issue(uploader.id, ['campaign:read', 'campaign:write']);
  const reader = await issue(uploader.id, ['campaign:read']);
  const wrongScope = await issue(uploader.id, ['plugins:read']);
  const otherWriter = await issue(colleague.id, ['campaign:read', 'campaign:write']);
  const stranger = await issue(outsider.id, ['campaign:read', 'campaign:write']);
  bootstrapStorageRegistry();
  const app = express(); app.use(defaultJsonBody); app.use(cookieParser());
  app.use('/api/campaigns/:campaignHandle', campaignScopedRouter); app.use('/api/assets', assetsRouter);
  const server = createServer(app); await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const base = `/api/campaigns/${campaign.handle}`, audio = `${base}/audio`, uploads = `${base}/asset-uploads`;
  const request = (token: string, path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => fetch(`${origin}${path}`, {
    method, signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const ok = async (response: Response, status = 200) => { const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data; };
  const wav = Buffer.alloc(16044); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
  const append = (token: string, id: string, offset: number, body: Buffer) => fetch(`${origin}${uploads}/${id}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(offset) }, body,
  });
  let recordingId = '', uploadId = '';
  try {
    await t.test('normal campaign members create/select recordings; concurrent creation retries return one recording', async () => {
      const path = `${audio}/sessions/${timeline.id}/recordings`, body = { title: 'Bot recording', consentAcknowledged: true };
      for (const consentAcknowledged of [undefined, false, 'true']) {
        assert.equal((await request(writer.raw, path, 'POST', { title: 'Missing consent', consentAcknowledged })).status, 400);
      }
      assert.equal(await prisma.sessionRecording.count({ where: { campaignId: campaign.id } }), 0);
      assert.equal((await request(reader.raw, path, 'POST', body)).status, 403);
      assert.equal((await request(wrongScope.raw, path, 'POST', body)).status, 403);
      assert.equal((await request(stranger.raw, path, 'POST', body)).status, 403);
      const responses = await Promise.all([0, 1].map(() => request(writer.raw, path, 'POST', body, { 'Idempotency-Key': 'recording-creation-1' })));
      const records = await Promise.all(responses.map((res) => ok(res, 201)));
      assert.equal(records[0].id, records[1].id); recordingId = records[0].id;
      assert.ok(records[0].consentAcknowledgedAt);
      assert.equal(records[0].consentAcknowledgedAt, records[1].consentAcknowledgedAt);
      assert.equal(await prisma.sessionRecording.count({ where: { campaignId: campaign.id } }), 1);
      const listing = await ok(await request(writer.raw, path)); assert.equal(listing[0].id, recordingId);
      assert.equal((await request(writer.raw, path, 'POST', { title: 'Changed request', consentAcknowledged: true }, { 'Idempotency-Key': 'recording-creation-1' })).status, 409);
      assert.equal((await request(writer.raw, path, 'POST', body, { 'Idempotency-Key': 'invalid key with spaces' })).status, 400);
      const removed = await ok(await request(writer.raw, path, 'POST', { title: 'Removed recording', consentAcknowledged: true }, { 'Idempotency-Key': 'deleted-recording' }), 201);
      await prisma.sessionRecording.delete({ where: { id: removed.id } });
      assert.equal((await request(writer.raw, path, 'POST', { title: 'Removed recording', consentAcknowledged: true }, { 'Idempotency-Key': 'deleted-recording' })).status, 410);
    });
    await t.test('upload creation is idempotent and byte progress survives lost replies without another quota reservation', async () => {
      const body = { purpose: 'session_audio', recordingId, name: 'part-one.wav', sizeBytes: String(wav.length) };
      const responses = await Promise.all([0, 1].map(() => request(writer.raw, uploads, 'POST', body, { 'Idempotency-Key': 'file-one' })));
      const rows = await Promise.all(responses.map((res) => ok(res, 201))); assert.equal(rows[0].id, rows[1].id); uploadId = rows[0].id;
      assert.equal(await prisma.assetUploadSession.count({ where: { recordingId } }), 1);
      assert.equal((await request(writer.raw, uploads, 'POST', { ...body, sizeBytes: String(wav.length + 1) }, { 'Idempotency-Key': 'file-one' })).status, 409);
      await ok(await append(writer.raw, uploadId, 0, wav.subarray(0, 1024)));
      assert.equal((await ok(await request(reader.raw, `${uploads}/${uploadId}`))).offsetBytes, '1024');
      const replay = await ok(await request(writer.raw, uploads, 'POST', body, { 'Idempotency-Key': 'file-one' }), 201);
      assert.equal(replay.id, uploadId); assert.equal(replay.offsetBytes, '1024');
      assert.equal((await append(writer.raw, uploadId, 0, wav.subarray(0, 1024))).status, 409);
      assert.equal((await append(reader.raw, uploadId, 1024, wav.subarray(1024))).status, 403);
      assert.equal((await request(otherWriter.raw, `${uploads}/${uploadId}`)).status, 404);
      assert.equal((await request(otherWriter.raw, `${uploads}/${uploadId}/finalize`, 'POST', {})).status, 404);
      await ok(await append(writer.raw, uploadId, 1024, wav.subarray(1024)));
      const final = await ok(await request(writer.raw, `${uploads}/${uploadId}/finalize`, 'POST', {}));
      const repeated = await ok(await request(writer.raw, `${uploads}/${uploadId}/finalize`, 'POST', {}));
      assert.equal(final.id, repeated.id); assert.equal(final.assetId, repeated.assetId);
      assert.equal(await prisma.sessionRecordingFile.count({ where: { recordingId } }), 1);
      assert.equal((await prisma.asset.findUnique({ where: { id: final.assetId } }))?.uploadedByUserId, uploader.id);
      const bytes = await fetch(`${origin}/api/assets/${final.assetId}`, { headers: { Authorization: `Bearer ${writer.raw}`, Range: 'bytes=0-3' } });
      assert.equal(bytes.status, 206); assert.equal(await bytes.text(), 'RIFF');
    });
    await t.test('a second file, chapters, and timestamped transcripts use the same scoped token APIs', async () => {
      const row = await ok(await request(writer.raw, uploads, 'POST', { recordingId, name: 'part-two.wav', sizeBytes: String(wav.length) }, { 'Idempotency-Key': 'file-two' }), 201);
      await ok(await append(writer.raw, row.id, 0, wav));
      await ok(await request(writer.raw, `${uploads}/${row.id}/finalize`, 'POST', {}));
      const recording = await ok(await request(writer.raw, `${audio}/recordings/${recordingId}`));
      assert.equal(recording.files.length, 2); assert.deepEqual(recording.files.map((f: { offsetMs: number }) => f.offsetMs), [0, 1000]);
      const chapter = await ok(await request(writer.raw, `${audio}/recordings/${recordingId}/chapters`, 'POST', { title: 'The letter', startMs: 1100 }), 201);
      assert.equal(chapter.fileId, recording.files[1].id); assert.equal(chapter.fileStartMs, 100);
      const draft = await ok(await request(writer.raw, `${audio}/recordings/${recordingId}/transcript/revisions`, 'POST', { expectedRevision: 0,
        segments: [{ startMs: 100, endMs: 1500, text: 'Neris discovers a letter.', speaker: 'Neris' }] }), 201);
      await ok(await request(writer.raw, `${audio}/recordings/${recordingId}/transcript/publish`, 'POST', { expectedRevision: 1, revisionId: draft.id }));
      const published = await ok(await request(reader.raw, `${audio}/recordings/${recordingId}/transcript`));
      assert.equal(published.current.segments[0].text, 'Neris discovers a letter.');
      assert.deepEqual((await prisma.wikiPage.findUnique({ where: { id: page.id } }))?.blocks, []);
    });
    await t.test('large transcript JSON is parsed only after campaign authentication and token authorization', async () => {
      const path = `${audio}/recordings/${recordingId}/transcript/revisions`;
      const malformed = (token: string) => fetch(`${origin}${path}`, { method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{invalid' });
      assert.equal((await malformed(stranger.raw)).status, 403);
      assert.equal((await malformed(reader.raw)).status, 403);
      assert.equal((await malformed(writer.raw)).status, 400);
      await prisma.campaignRoleCapabilityOverride.deleteMany({ where: { campaignId: campaign.id, role: 'PARTICIPANT', capability: C.AUDIO_TRANSCRIPT_EDIT } });
      invalidateCampaignCapabilityOverrideCache(campaign.id);
      try { assert.equal((await malformed(writer.raw)).status, 403); }
      finally {
        await prisma.campaignRoleCapabilityOverride.create({ data: { campaignId: campaign.id, role: 'PARTICIPANT', capability: C.AUDIO_TRANSCRIPT_EDIT, effect: CapabilityOverrideEffect.GRANT } });
        invalidateCampaignCapabilityOverrideCache(campaign.id);
      }
      await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: WikiVisibility.DM_ONLY } });
      try { assert.equal((await malformed(writer.raw)).status, 404); }
      finally { await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: WikiVisibility.PARTY } }); }
      const transcript = await ok(await request(writer.raw, `${audio}/recordings/${recordingId}/transcript`));
      const text = 'A'.repeat(150000);
      await ok(await request(writer.raw, path, 'POST', { expectedRevision: transcript.revision,
        segments: [{ startMs: null, endMs: null, text }] }), 201);
      assert.equal((await request(writer.raw, `${audio}/recordings/${recordingId}/chapters`, 'POST', { title: text, startMs: 0 })).status, 413);
      const settings = await audioSettings();
      const bounded = { expectedRevision: transcript.revision + 1, segments: [{ startMs: null, endMs: null, text: 'An exact-size draft.' }] };
      const wire = JSON.stringify(bounded);
      await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { maxTranscriptBytes: Buffer.byteLength(wire) } });
      try {
        await ok(await request(writer.raw, path, 'POST', bounded), 201);
        const oversized = await fetch(`${origin}${path}`, { method: 'POST',
          headers: { Authorization: `Bearer ${writer.raw}`, 'Content-Type': 'application/json' }, body: `${wire} ` });
        assert.equal(oversized.status, 413);
        assert.equal((await oversized.json()).code, 'transcript_too_large');
      } finally { await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { maxTranscriptBytes: settings.maxTranscriptBytes } }); }
    });
    await t.test('quotas, cross-campaign IDs, session disclosure, and changed permissions remain enforced', async () => {
      const body = { recordingId, name: 'third.wav', sizeBytes: String(wav.length) };
      await prisma.campaignAudioSettings.update({ where: { campaignId: campaign.id }, data: { maxStorageBytes: BigInt(wav.length * 2) } });
      assert.equal((await request(writer.raw, uploads, 'POST', body)).status, 413);
      assert.equal((await request(otherWriter.raw, uploads, 'POST', body)).status, 403);
      assert.equal((await request(writer.raw, `/api/campaigns/${other.handle}/asset-uploads`, 'POST', body)).status, 404);
      await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: WikiVisibility.DM_ONLY } });
      assert.equal((await request(writer.raw, `${uploads}/${uploadId}`)).status, 404);
      assert.equal((await request(writer.raw, `${uploads}/${uploadId}/finalize`, 'POST', {})).status, 404);
      await prisma.wikiPage.update({ where: { id: page.id }, data: { visibility: WikiVisibility.PARTY } });
      await prisma.campaignRoleCapabilityOverride.updateMany({
        where: { campaignId: campaign.id, role: 'PARTICIPANT', capability: C.AUDIO_UPLOAD },
        data: { effect: CapabilityOverrideEffect.REVOKE },
      });
      invalidateCampaignCapabilityOverrideCache(campaign.id);
      assert.equal((await request(writer.raw, `${uploads}/${uploadId}/finalize`, 'POST', {})).status, 403);
      await prisma.campaignMember.delete({ where: { userId_campaignId: { userId: uploader.id, campaignId: campaign.id } } });
      assert.equal((await request(writer.raw, `${uploads}/${uploadId}`)).status, 403);
      await prisma.userToken.update({ where: { id: writer.id }, data: { expiresAt: new Date(0) } });
      assert.ok([401, 403].includes((await request(writer.raw, `${audio}/sessions/${timeline.id}/recordings`)).status));
    });
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
});
