import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import test from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { signAuthTokenForUser, authenticateApiOrSession } from '../middleware/auth.js';
import { resolveCampaignScope, requireCampaignMembership } from '../middleware/campaignScope.js';
import { campaignAudioRouter } from '../routes/audioSettings.js';
import { audioUploadsRouter } from '../routes/audioUploads.js';
import { sessionRecordingsRouter } from '../routes/sessionRecordings.js';
import { assetsRouter } from '../routes/assets.js';
import { adminRouter } from '../routes/admin.js';
import { bootstrapStorageRegistry } from './storage/storageRegistry.js';
import { audioSettings, audioContext, recordingAccess } from './audioCore.js';
import { reserveTranscription, resolveTranscription } from './processingProviders.js';
import { sweepTranscriptionJobs } from './transcriptionRunner.js';
import { buildSessionAudioBackup, restoreSessionAudioBackup, cloneSessionAudio } from './sessionAudioBackup.js';
import { streamCampaignBackupZip } from './campaignExport/buildCampaignBackupZip.js';
import { stageBackupZip } from './stagedBackupZip.js';
import { buildSovereignExport } from './campaignExport/buildSovereignExport.js';
import { processCampaignBackupRestore } from './campaignBackupRestore.js';
import { sweepAudioUploads, stagingPath } from './audioUploads.js';

test('session audio: resumable uploads, private ranges, chapters, transcripts, provider revocation, preservation',
  { skip: process.env.SESSION_AUDIO_TEST_DATABASE !== '1' }, async (t) => {
  const owner = await prisma.user.create({ data: { email: 'audio-owner@example.invalid', displayName: 'Neris' } });
  const player = await prisma.user.create({ data: { email: 'audio-player@example.invalid', displayName: 'Rowan' } });
  const admin = await prisma.user.create({ data: { email: 'audio-admin@example.invalid', role: 'SYSTEM_ADMIN' } });
  const campaign = await prisma.campaign.create({ data: { name: 'Florence', handle: 'audio-florence', campaignOwnerUserId: owner.id,
    members: { create: [{ userId: owner.id, role: 'GAMEMASTER' }, { userId: player.id, role: 'PARTICIPANT' }] } } });
  const other = await prisma.campaign.create({ data: { name: 'Iron Coast', handle: 'audio-iron-coast', campaignOwnerUserId: owner.id,
    members: { create: { userId: owner.id, role: 'GAMEMASTER' } } } });
  const page = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Session 1', visibility: 'Party', blocks: [] } });
  const timeline = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: page.id, authorId: owner.id, sequenceOrder: 1 } });
  const cookies = new Map<string, string>();
  for (const user of [owner, player, admin]) cookies.set(user.id, `${env.cookieName}=${await signAuthTokenForUser(user)}`);
  bootstrapStorageRegistry(); await audioSettings();
  const app = express(); app.use(express.json({ limit: '11mb' })); app.use(cookieParser());
  app.use('/api/admin', adminRouter); app.use('/api/assets', assetsRouter);
  const scoped = express.Router({ mergeParams: true });
  scoped.use(authenticateApiOrSession, resolveCampaignScope, requireCampaignMembership);
  scoped.use('/audio', campaignAudioRouter, sessionRecordingsRouter); scoped.use('/asset-uploads', audioUploadsRouter);
  app.use('/api/campaigns/:campaignHandle', scoped);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: error.message }));
  const server = createServer(app); await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const api = async (userId: string, suffix: string, method = 'GET', body?: unknown) => fetch(`${base}/api${suffix}`, {
    method, headers: { Cookie: cookies.get(userId)!, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const audio = `/campaigns/${campaign.handle}/audio`;
  const uploads = `/campaigns/${campaign.handle}/asset-uploads`;
  const ok = async (response: Response, expected = 200) => { const body = await response.json(); assert.equal(response.status, expected, JSON.stringify(body)); return body; };
  let recording: { id: string; revision: number };
  try {
    await t.test('uploads are governed before enabling; global admin does not gain membership', async () => {
      assert.equal((await audioSettings()).enabled, true);
      assert.equal((await ok(await api(owner.id, `${audio}/settings`))).settings.enabled, true);
      await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { enabled: false } });
      assert.equal((await api(owner.id, `${audio}/sessions/${timeline.id}/recordings`, 'POST', { title: 'A discovery' })).status, 403);
      assert.equal((await api(admin.id, `${audio}/sessions/${timeline.id}/recordings`)).status, 403);
      await ok(await api(admin.id, '/admin/audio', 'PATCH', { enabled: true, transcriptionEnabled: true }));
      await ok(await api(owner.id, `${audio}/settings`, 'PATCH', { enabled: true, allowPov: true, transcriptionEnabled: true }));
      recording = await ok(await api(owner.id, `${audio}/sessions/${timeline.id}/recordings`, 'POST', { title: 'A discovery', visibility: 'uploader_and_managers' }), 201);
      assert.equal((await api(owner.id, `/campaigns/${other.handle}/audio/recordings/${recording.id}`)).status, 404);
    });
    const wav = Buffer.alloc(32044); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(32000, 40);
    let file: { id: string; assetId: string };
    await t.test('resumes from authoritative offsets, finalizes idempotently and checks private byte ranges', async () => {
      const upload = await ok(await api(owner.id, `${uploads}`, 'POST', { recordingId: recording.id, name: 'session.wav', sizeBytes: String(wav.length) }), 201);
      const append = (offset: number, buffer: Buffer) => fetch(`${base}/api${uploads}/${upload.id}`, { method: 'PATCH',
        headers: { Cookie: cookies.get(owner.id)!, 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(offset) }, body: buffer });
      await ok(await append(0, wav.subarray(0, 1000)));
      assert.equal((await append(0, wav.subarray(0, 1000))).status, 409);
      await fs.promises.appendFile(stagingPath(upload.id), Buffer.from('interrupted chunk'));
      await prisma.assetUploadSession.update({ where: { id: upload.id }, data: { status: 'appending' } });
      await sweepAudioUploads(true);
      const resumed = await ok(await api(owner.id, `${uploads}/${upload.id}`)); assert.equal(resumed.offsetBytes, '1000');
      await ok(await append(1000, wav.subarray(1000)));
      file = await ok(await api(owner.id, `${uploads}/${upload.id}/finalize`, 'POST', {}));
      const again = await ok(await api(owner.id, `${uploads}/${upload.id}/finalize`, 'POST', {})); assert.equal(again.id, file.id);
      const partial = await fetch(`${base}/api/assets/${file.assetId}`, { headers: { Cookie: cookies.get(owner.id)!, Range: 'bytes=0-3' } });
      assert.equal(partial.status, 206); assert.equal(await partial.text(), 'RIFF');
      assert.equal(partial.headers.get('content-range'), `bytes 0-3/${wav.length}`);
      const head = await fetch(`${base}/api/assets/${file.assetId}`, { method: 'HEAD', headers: { Cookie: cookies.get(owner.id)! } });
      assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(wav.length));
      assert.equal((await fetch(`${base}/api/assets/${file.assetId}`, { headers: { Cookie: cookies.get(admin.id)!, Range: 'bytes=0-3' } })).status, 404);
      assert.equal((await fetch(`${base}/api/assets/${file.assetId}`, { headers: { Cookie: cookies.get(player.id)!, Range: 'bytes=0-3' } })).status, 404);
      assert.equal((await fetch(`${base}/api/assets/${file.assetId}`, { headers: { Cookie: cookies.get(owner.id)!, Range: 'bytes=999999-' } })).status, 416);
      const media = await prisma.asset.findUnique({ where: { id: file.assetId } });
      const artifact = await prisma.asset.create({ data: { campaignId: campaign.id, type: 'campaign-export-zip', url: media!.url } });
      assert.equal((await api(player.id, `/assets/${artifact.id}`)).status, 403);
      assert.equal((await api(admin.id, `/assets/${artifact.id}`)).status, 403);
      assert.equal((await api(admin.id, `/admin/campaigns/${campaign.id}/backup`)).status, 403);
      assert.equal((await api(admin.id, '/admin/system/backup')).status, 403);
    });
    await t.test('concurrent upload reservations enforce physical campaign quotas and cancellation releases them', async () => {
      const global = await audioSettings();
      await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { maxCampaignBytes: BigInt(wav.length * 2) } });
      try {
        const responses = await Promise.all([0, 1].map((i) => api(owner.id, `${uploads}`, 'POST', { recordingId: recording.id, name: `reserved-${i}.wav`, sizeBytes: String(wav.length) })));
        assert.deepEqual(responses.map((r) => r.status).sort(), [201, 413]);
        for (const response of responses) if (response.status === 201) {
          const upload = await response.json(); assert.equal((await api(owner.id, `${uploads}/${upload.id}`, 'DELETE')).status, 204);
        }
      } finally { await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { maxCampaignBytes: global.maxCampaignBytes } }); }
    });
    await t.test('filename extensions cannot make invalid content playable and expired staging is cleaned', async () => {
      const upload = await ok(await api(owner.id, `${uploads}`, 'POST', { recordingId: recording.id, name: 'fake.mp3', sizeBytes: '8' }), 201);
      await ok(await fetch(`${base}/api${uploads}/${upload.id}`, { method: 'PATCH', headers: {
        Cookie: cookies.get(owner.id)!, 'Content-Type': 'application/octet-stream', 'Upload-Offset': '0' }, body: Buffer.from('notaudio') }));
      assert.equal((await api(owner.id, `${uploads}/${upload.id}/finalize`, 'POST', {})).status, 400);
      await prisma.assetUploadSession.update({ where: { id: upload.id }, data: { expiresAt: new Date(0) } });
      await sweepAudioUploads(); assert.equal(fs.existsSync(stagingPath(upload.id)), false);
      assert.equal((await prisma.assetUploadSession.findUnique({ where: { id: upload.id } }))?.status, 'expired');
    });
    await t.test('chapters work before transcripts; native editing and publication preserve revisions', async () => {
      const chapter = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/chapters`, 'POST', { title: 'The letter', startMs: 500 }), 201);
      assert.equal(chapter.fileId, file.id); assert.equal(chapter.fileStartMs, 500);
      const revision = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript/revisions`, 'POST', {
        expectedRevision: 0, format: 'srt', text: '1\n00:00:00,100 --> 00:00:00,900\nNeris discovers a letter.' }), 201);
      await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript/publish`, 'POST', { expectedRevision: 1, revisionId: revision.id }));
      assert.equal((await api(owner.id, `${audio}/recordings/${recording.id}/transcript/revisions`, 'POST', { expectedRevision: 0, text: 'Stale edit', format: 'txt' })).status, 409);
      const preview = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/timeline/preview`, 'POST', { fileIds: [] }));
      assert.equal(preview.affectedChapters.length, 1); assert.equal(preview.affectedSegments.length, 1);
      assert.equal((await api(owner.id, `${audio}/recordings/${recording.id}/timeline/commit`, 'POST', { fileIds: [], expectedRevision: preview.revision, resolutions: {} })).status, 409);
    });
    await t.test('provider access defaults to denied; resource admins see usage but cannot read drafts', async () => {
      const connection = await prisma.processingConnection.create({ data: { name: 'Local Whisper', protocol: 'whisper_cpp', endpoint: 'http://127.0.0.1:9/inference',
        enabled: true, allowPrivateNetwork: true, capabilities: ['audio.transcribe'], formats: ['wav'] } });
      await assert.rejects(resolveTranscription({ campaignId: campaign.id, userId: owner.id, connectionId: connection.id }), /campaign_not_granted/);
      const grant = await prisma.processingCampaignGrant.create({ data: { campaignId: campaign.id, connectionId: connection.id,
        feature: 'session_audio', capability: 'audio.transcribe', enabled: true, modelIds: [], monthlyRequests: 1 } });
      const job = await reserveTranscription({ campaignId: campaign.id, userId: owner.id, recordingId: recording.id, connectionId: connection.id });
      await assert.rejects(reserveTranscription({ campaignId: campaign.id, userId: owner.id, recordingId: recording.id, connectionId: connection.id }), /usage_limit_exceeded/);
      const alternative = await prisma.processingConnection.create({ data: { name: 'Alternative Whisper', protocol: 'whisper_cpp', endpoint: 'http://127.0.0.1:9/inference',
        enabled: true, allowPrivateNetwork: true, capabilities: ['audio.transcribe'], formats: ['wav'] } });
      await prisma.processingCampaignGrant.create({ data: { campaignId: campaign.id, connectionId: alternative.id, feature: 'session_audio', capability: 'audio.transcribe', enabled: true, modelIds: [] } });
      await prisma.campaignAudioSettings.update({ where: { campaignId: campaign.id }, data: { monthlyRequests: 1 } });
      await assert.rejects(reserveTranscription({ campaignId: campaign.id, userId: owner.id, recordingId: recording.id, connectionId: alternative.id }), /usage_limit_exceeded/);
      await prisma.campaignAudioSettings.update({ where: { campaignId: campaign.id }, data: { monthlyRequests: null } });
      await prisma.processingCampaignGrant.update({ where: { id: grant.id }, data: { enabled: false, revision: { increment: 1 } } });
      await sweepTranscriptionJobs();
      for (let i = 0; i < 30; i++) {
        const current = await prisma.transcriptionJob.findUnique({ where: { id: job.id } });
        if (current?.status !== 'running') break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.notEqual((await prisma.transcriptionJob.findUnique({ where: { id: job.id } }))?.status, 'succeeded');
      const metrics = await ok(await api(admin.id, '/admin/providers/usage/all'));
      assert.equal(metrics[0].campaignId, campaign.id); assert.equal(JSON.stringify(metrics).includes('Neris discovers'), false);
      assert.equal((await api(admin.id, `${audio}/recordings/${recording.id}/transcript`)).status, 403);
      const current = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`));
      await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript/revisions`, 'POST', { expectedRevision: current.revision, segments: [{ startMs: null, endMs: null, text: 'Manual edits survive provider revocation.' }] }), 201);
      assert.equal((await api(owner.id, `${audio}/recordings/${recording.id}`)).status, 200);
    });
    await t.test('a configured provider runs asynchronously and imports a native timestamped draft', async () => {
      const provider = createServer(async (req, res) => {
        for await (const _chunk of req) { /* Drain streamed multipart input. */ }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ transcription: [{ offsets: { from: 100, to: 800 }, text: 'A private provider draft.' }] }));
      });
      await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
      try {
        const connection = await prisma.processingConnection.create({ data: { name: 'Mock Whisper', protocol: 'whisper_cpp',
          endpoint: `http://127.0.0.1:${(provider.address() as { port: number }).port}/inference`, allowPrivateNetwork: true,
          enabled: true, capabilities: ['audio.transcribe'], formats: ['wav'] } });
        const grant = await prisma.processingCampaignGrant.create({ data: { campaignId: campaign.id, connectionId: connection.id,
          feature: 'session_audio', capability: 'audio.transcribe', enabled: true, modelIds: [] } });
        const before = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`));
        const job = await reserveTranscription({ campaignId: campaign.id, userId: owner.id, recordingId: recording.id, connectionId: connection.id });
        await sweepTranscriptionJobs();
        let status = '';
        for (let i = 0; i < 100; i++) {
          const current = await prisma.transcriptionJob.findUnique({ where: { id: job.id } }); status = current?.status ?? '';
          if (!['running', 'queued'].includes(status)) break;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.equal(status, 'succeeded');
        const current = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`));
        assert.equal(current.current.source, 'provider'); assert.equal(current.current.segments[0].startMs, 100);
        assert.equal(current.publishedRevisionId, before.publishedRevisionId);
        const usage = await prisma.processingUsage.findUnique({ where: { jobId: job.id } });
        assert.equal(usage?.startedRequests, 1); assert.equal(usage?.completedDurationMs, 1000n);
        await prisma.processingCampaignGrant.update({ where: { id: grant.id }, data: { enabled: false, revision: { increment: 1 } } });
        assert.equal((await api(owner.id, `${audio}/recordings/${recording.id}/transcript/publish`, 'POST', { expectedRevision: current.revision, revisionId: current.current.id })).status, 403);
        assert.equal((await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`))).current.id, current.current.id);
      } finally { provider.closeAllConnections(); await new Promise<void>((resolve) => provider.close(() => resolve())); }
    });
    await t.test('multi-file reordering remaps chapters and cross-file cues display once', async () => {
      const upload = await ok(await api(owner.id, `${uploads}`, 'POST', { recordingId: recording.id, name: 'session-part-two.wav', sizeBytes: String(wav.length) }), 201);
      await ok(await fetch(`${base}/api${uploads}/${upload.id}`, { method: 'PATCH', headers: {
        Cookie: cookies.get(owner.id)!, 'Content-Type': 'application/octet-stream', 'Upload-Offset': '0' }, body: wav }));
      const second = await ok(await api(owner.id, `${uploads}/${upload.id}/finalize`, 'POST', {}));
      const preview = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/timeline/preview`, 'POST', { fileIds: [second.id, file.id] }));
      await ok(await api(owner.id, `${audio}/recordings/${recording.id}/timeline/commit`, 'POST', { expectedRevision: preview.revision, fileIds: [second.id, file.id], resolutions: {} }));
      const reordered = await ok(await api(owner.id, `${audio}/recordings/${recording.id}`));
      assert.equal(reordered.chapters[0].startMs, 1500); assert.equal(reordered.durationMs, 2000);
      const transcript = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`));
      await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript/revisions`, 'POST', {
        expectedRevision: transcript.revision, segments: [{ startMs: 500, endMs: 1500, text: 'One sentence spanning two files.' }] }), 201);
      const merged = await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`));
      assert.equal(merged.current.segments.length, 1); assert.equal(merged.current.segments[0].endMs, 1500);
    });
    await t.test('streamed archive preserves media and audio manifest; clone copies isolated assets without grants', async () => {
      const payload = await buildSessionAudioBackup(campaign.id);
      const filename = path.join(env.uploadsDir, 'audio-test.zip');
      await pipeline(streamCampaignBackupZip([{ path: 'sovereign/audio.json', content: JSON.stringify(payload) },
        { path: 'media.wav', content: '', sourcePath: path.join(env.uploadsDir, path.basename((await prisma.asset.findUnique({ where: { id: file.assetId } }))!.url)) }]), fs.createWriteStream(filename));
      const staged = await stageBackupZip(filename);
      try { assert.equal(staged.file('media.wav')?.size, wav.length); assert.ok(JSON.parse(await staged.file('sovereign/audio.json')!.async('string')).recordings.length); }
      finally { await staged.close(); }
      const targetPage = await prisma.wikiPage.create({ data: { campaignId: other.id, title: 'Session 1', visibility: 'Party', blocks: [] } });
      await cloneSessionAudio(campaign.id, other.id, new Map([[page.id, targetPage.id]]));
      const cloned = await prisma.sessionRecording.findFirst({ where: { campaignId: other.id }, include: { files: true, transcript: true } });
      assert.ok(cloned); assert.notEqual(cloned.files[0].assetId, file.assetId);
      assert.equal(await prisma.processingCampaignGrant.count({ where: { campaignId: other.id } }), 0);
      const asset = await prisma.asset.findUnique({ where: { id: cloned.files[0].assetId } }); assert.equal(asset?.campaignId, other.id);
      const exported = await buildSovereignExport(campaign.id);
      assert.ok(exported);
      const backupName = 'full-audio-roundtrip.zip';
      await pipeline(streamCampaignBackupZip(exported.files), fs.createWriteStream(path.join(env.uploadsDir, backupName)));
      await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { enabled: false } });
      const archiveBytes = await fs.promises.readFile(path.join(env.uploadsDir, backupName));
      const backupUpload = await ok(await api(owner.id, uploads, 'POST', { purpose: 'campaign_backup', name: backupName, sizeBytes: String(archiveBytes.length) }), 201);
      await ok(await fetch(`${base}/api${uploads}/${backupUpload.id}`, { method: 'PATCH', headers: {
        Cookie: cookies.get(owner.id)!, 'Content-Type': 'application/octet-stream', 'Upload-Offset': '0' }, body: archiveBytes }));
      const finalized = await ok(await api(owner.id, `${uploads}/${backupUpload.id}/finalize`, 'POST', {}));
      assert.ok(finalized.assetId);
      assert.equal((await api(player.id, `/assets/${finalized.assetId}`)).status, 403);
      await processCampaignBackupRestore(campaign.id);
      const restored = await prisma.sessionRecording.findFirst({ where: { campaignId: campaign.id }, include: { files: true, chapters: true, transcript: true } });
      assert.ok(restored); assert.equal(restored.files.length, 2); assert.equal(restored.chapters[0].startMs, 1500);
      assert.ok(restored.transcript?.publishedRevisionId); recording = restored;
    });
    await t.test('detaching or deleting does not silently free physical storage', async () => {
      const asset = await prisma.asset.findUnique({ where: { id: file.assetId } }); assert.equal(asset?.sizeBytes, BigInt(wav.length));
      await prisma.sessionRecording.delete({ where: { id: recording.id } });
      assert.ok(await prisma.asset.findUnique({ where: { id: file.assetId } }));
      assert.equal((await api(admin.id, `/assets/${file.assetId}`)).status, 404);
      assert.equal((await api(admin.id, `/admin/campaigns/${campaign.id}/backup`)).status, 403);
    });
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
});
