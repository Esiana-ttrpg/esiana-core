import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { syncBuiltinESMExports } from 'node:module';
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
import { sweepAudioUploads, stagingPath } from './audioUploads.js';
import { downloadCampaignBackup, startAsyncCampaignBackup, restoreCampaignBackup } from '../controllers/campaignBackupController.js';
import { getBackgroundTask } from './taskRegistry.js';
import { getRecentSystemLogs } from './systemLogBuffer.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Response } from 'express';
import { duplicateCampaign } from './campaignClone.js';
import { duplicateCampaignHandler } from '../controllers/campaignsController.js';
import { AudioError } from './audioCore.js';
import { deleteCampaignAssetFiles } from './assetFiles.js';
import { getActiveStorageDriver } from './storage/storageRegistry.js';
import type { CampaignCloneOptions } from './campaignCloneOptions.js';

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
  let recording: { id: string; revision: number; consentAcknowledgedAt?: string | Date | null };
  try {
    await t.test('uploads are governed before enabling; global admin does not gain membership', async () => {
      assert.equal((await audioSettings()).enabled, true);
      assert.equal((await ok(await api(owner.id, `${audio}/settings`))).settings.enabled, true);
      await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { enabled: false } });
      assert.equal((await api(owner.id, `${audio}/sessions/${timeline.id}/recordings`, 'POST', { title: 'A discovery' })).status, 403);
      assert.equal((await api(admin.id, `${audio}/sessions/${timeline.id}/recordings`)).status, 403);
      await ok(await api(admin.id, '/admin/audio', 'PATCH', { enabled: true, transcriptionEnabled: true }));
      await ok(await api(owner.id, `${audio}/settings`, 'PATCH', { enabled: true, allowPov: true, transcriptionEnabled: true }));
      for (const consentAcknowledged of [undefined, false, 'true']) {
        assert.equal((await api(owner.id, `${audio}/sessions/${timeline.id}/recordings`, 'POST', { title: 'A discovery', consentAcknowledged })).status, 400);
      }
      recording = await ok(await api(owner.id, `${audio}/sessions/${timeline.id}/recordings`, 'POST', { title: 'A discovery', consentAcknowledged: true, visibility: 'uploader_and_managers' }), 201);
      assert.ok(recording.consentAcknowledgedAt);
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
    await t.test('quota aggregates isolate session, campaign and global totals and ignore inactive or backup uploads', async () => {
      const previous = await audioSettings();
      const stored = await prisma.asset.aggregate({ where: { type: 'SessionAudio' }, _sum: { sizeBytes: true } });
      const pending = await prisma.assetUploadSession.aggregate({ where: { purpose: 'session_audio', status: { in: ['uploading', 'appending', 'finalizing'] } }, _sum: { sizeBytes: true } });
      const globalBase = (stored._sum.sizeBytes ?? 0n) + (pending._sum.sizeBytes ?? 0n);
      const extraPage = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Another session', visibility: 'Party', blocks: [] } });
      const extraTimeline = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: extraPage.id, authorId: owner.id, sequenceOrder: 2 } });
      const extraRecording = await prisma.sessionRecording.create({ data: { campaignId: campaign.id, timelineId: extraTimeline.id, uploadedByUserId: owner.id, title: 'Pending elsewhere' } });
      const foreign = await prisma.asset.create({ data: { campaignId: other.id, url: '/uploads/quota-fixture.wav', type: 'SessionAudio', sizeBytes: 50n } });
      const ignored = await prisma.asset.create({ data: { campaignId: campaign.id, url: '/uploads/quota-image.png', type: 'Image', sizeBytes: 100000n } });
      const fixtures = await Promise.all([
        prisma.assetUploadSession.create({ data: { campaignId: campaign.id, recordingId: extraRecording.id, userId: player.id, name: 'pending.wav', sizeBytes: 50n, status: 'appending', expiresAt: new Date(Date.now() + 60000) } }),
        prisma.assetUploadSession.create({ data: { campaignId: campaign.id, userId: player.id, name: 'backup.zip', purpose: 'campaign_backup', sizeBytes: 100000n, expiresAt: new Date(Date.now() + 60000) } }),
        prisma.assetUploadSession.create({ data: { campaignId: campaign.id, recordingId: recording.id, userId: player.id, name: 'cancelled.wav', status: 'cancelled', sizeBytes: 100000n, expiresAt: new Date(Date.now() + 60000) } }),
      ]);
      const sessionLimit = BigInt(wav.length + 8), campaignLimit = BigInt(wav.length + 58), globalLimit = globalBase + 108n;
      try {
        await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { maxSessionBytes: sessionLimit, maxCampaignBytes: campaignLimit, maxGlobalBytes: globalLimit } });
        const allowed = await ok(await api(owner.id, uploads, 'POST', { recordingId: recording.id, name: 'fits.wav', sizeBytes: '8' }), 201);
        assert.equal((await api(owner.id, `${uploads}/${allowed.id}`, 'DELETE')).status, 204);
        assert.equal((await prisma.assetUploadSession.findUnique({ where: { id: allowed.id } }))?.status, 'cancelled');
        for (const limits of [
          { maxSessionBytes: sessionLimit - 1n },
          { maxSessionBytes: sessionLimit, maxCampaignBytes: campaignLimit - 1n },
          { maxCampaignBytes: campaignLimit, maxGlobalBytes: globalLimit - 1n },
        ]) {
          await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: limits });
          assert.equal((await api(owner.id, uploads, 'POST', { recordingId: recording.id, name: 'over.wav', sizeBytes: '8' })).status, 413);
        }
      } finally {
        await prisma.assetUploadSession.deleteMany({ where: { id: { in: fixtures.map((entry) => entry.id) } } });
        await prisma.sessionRecording.delete({ where: { id: extraRecording.id } });
        await prisma.campaignSessionTimeline.delete({ where: { id: extraTimeline.id } });
        await prisma.wikiPage.delete({ where: { id: extraPage.id } });
        await prisma.asset.deleteMany({ where: { id: { in: [foreign.id, ignored.id] } } });
        await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { maxSessionBytes: previous.maxSessionBytes, maxCampaignBytes: previous.maxCampaignBytes, maxGlobalBytes: previous.maxGlobalBytes } });
      }
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
      let startMs = 100, endMs = 1010;
      const provider = createServer(async (req, res) => {
        for await (const _chunk of req) { /* Drain streamed multipart input. */ }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ transcription: [{ offsets: { from: startMs, to: endMs }, text: 'A private provider draft.' }] }));
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
        assert.equal(current.current.segments[0].endMs, 1000);
        assert.equal(current.current.segments[0].fileEndMs, 1000);
        assert.equal(current.publishedRevisionId, before.publishedRevisionId);
        const usage = await prisma.processingUsage.findUnique({ where: { jobId: job.id } });
        assert.equal(usage?.startedRequests, 1); assert.equal(usage?.completedDurationMs, 1000n);
        for (const invalidStart of [1000, 1010]) {
          startMs = invalidStart; endMs = invalidStart + 100;
          const invalid = await reserveTranscription({ campaignId: campaign.id, userId: owner.id, recordingId: recording.id, connectionId: connection.id });
          await sweepTranscriptionJobs();
          for (let i = 0; i < 100; i++) {
            const status = (await prisma.transcriptionJob.findUnique({ where: { id: invalid.id } }))?.status;
            if (!['running', 'queued'].includes(status ?? '')) break;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          const failed = await prisma.transcriptionJob.findUnique({ where: { id: invalid.id } });
          assert.equal(failed?.status, 'failed'); assert.equal(failed?.failureCode, 'provider_timestamps_out_of_bounds');
          assert.equal((await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`))).current.id, current.current.id);
        }
        await prisma.processingCampaignGrant.update({ where: { id: grant.id }, data: { enabled: false, revision: { increment: 1 } } });
        assert.equal((await api(owner.id, `${audio}/recordings/${recording.id}/transcript/publish`, 'POST', { expectedRevision: current.revision, revisionId: current.current.id })).status, 403);
        assert.equal((await ok(await api(owner.id, `${audio}/recordings/${recording.id}/transcript`))).current.id, current.current.id);
      } finally { provider.closeAllConnections(); await new Promise<void>((resolve) => provider.close(() => resolve())); }
    });
    await t.test('backup streaming failures preserve logging and avoid sending JSON after headers', async () => {
      const req = { campaign: { campaignId: campaign.id, campaignHandle: campaign.handle }, user: owner, params: {} } as CampaignScopedRequest;
      for (const sent of [false, true]) {
        let status = 0, payload: unknown;
        const sink = new Writable({ write(_chunk, _encoding, callback) {
          Object.assign(sink, { headersSent: sent }); callback(new Error('backup-stream-fixture'));
        } });
        Object.assign(sink, { headersSent: false, setHeader() {},
          status(code: number) { status = code; return this; }, json(body: unknown) { payload = body; return this; } });
        await downloadCampaignBackup(req, sink as unknown as Response);
        assert.ok(sink.destroyed);
        if (sent) { assert.equal(status, 0); assert.equal(payload, undefined); }
        else { assert.equal(status, 500); assert.deepEqual(payload, { error: 'Unable to generate campaign backup' }); }
        assert.ok(getRecentSystemLogs().some((log) => log.message.includes('Campaign sovereign backup failed: backup-stream-fixture')));
      }
    });
    await t.test('restore rejects paths outside configured upload storage before reading or renaming', async () => {
      for (const filename of ['../outside-backup.zip', path.resolve(env.uploadsDir, '..', 'outside-backup.zip'), '.']) {
        let status = 0, message = '';
        await restoreCampaignBackup({ campaign: { campaignId: campaign.id, campaignHandle: campaign.handle }, user: owner,
          files: { backupZipFile: [{ filename }] } } as unknown as CampaignScopedRequest & AuthenticatedRequest,
        { status(code: number) { status = code; return this; }, json(body: { error: string }) { message = body.error; } } as unknown as Response);
        assert.equal(status, 400);
        assert.equal(message, 'Uploaded file path is invalid');
      }
    });
    await t.test('site-admin recovery backups audit their override without granting normal content access', async () => {
      assert.equal((await api(owner.id, '/admin/system/backup')).status, 403);
      const system = await api(admin.id, '/admin/system/backup');
      assert.equal(system.status, 200);
      assert.equal(Buffer.from(await system.arrayBuffer()).subarray(0, 16).toString(), 'SQLite format 3\0');
      const backup = await api(admin.id, `/admin/campaigns/${campaign.id}/backup`);
      assert.equal(backup.status, 200); await backup.arrayBuffer();
      assert.ok(getRecentSystemLogs().some((log) => log.message.includes(`actor=${admin.id} scope=system`)));
      assert.ok(getRecentSystemLogs().some((log) => log.message.includes(`actor=${admin.id} scope=campaign:${campaign.id}`)));
      assert.equal((await api(admin.id, `${audio}/recordings/${recording.id}`)).status, 403);
      assert.equal((await api(admin.id, `/assets/${file.assetId}`)).status, 404);
    });
    await t.test('failed async export pipelines remove their partial file and retain FAILED task status', async (t) => {
      let partial: string | undefined;
      const original = fs.createWriteStream;
      const write = t.mock.method(fs, 'createWriteStream', (...args: Parameters<typeof fs.createWriteStream>) => {
        partial = String(args[0]);
        const stream = original(...args);
        stream.once('open', () => stream.destroy(new Error('async-export-fixture')));
        return stream;
      });
      syncBuiltinESMExports();
      try {
        let taskId = '';
        const response = { status() { return this; }, json(body: { taskId: string }) { taskId = body.taskId; } } as unknown as Response;
        await startAsyncCampaignBackup({ campaign: { campaignId: campaign.id, campaignHandle: campaign.handle }, user: owner } as CampaignScopedRequest & AuthenticatedRequest, response);
        for (let attempt = 0; attempt < 200 && getBackgroundTask(taskId)?.status !== 'FAILED'; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.equal(getBackgroundTask(taskId)?.status, 'FAILED');
        assert.match(getBackgroundTask(taskId)?.errorMessage ?? '', /async-export-fixture/);
        assert.ok(partial);
        assert.equal(fs.existsSync(partial), false);
      } finally { write.mock.restore(); syncBuiltinESMExports(); }
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
    await t.test('campaign audio cloning preflights media and removes committed destinations after copy failures', async (t) => {
      const copy: CampaignCloneOptions = {
        structure: { wikiPages: true, folderStructure: true, sidebarLayout: false },
        recruitment: { settings: false, tableStyleTags: false, safety: false, publicDocs: false },
        scheduling: { calendarStructure: false, sessionCadence: false, sessionEventsLogs: true, sessionRecordings: true },
        gameplay: { characters: false, inventoryState: false, mapsAssets: true, diceHistory: false },
        community: { members: false, joinRequests: false, chatHistory: false },
      };
      for (const missing of ['sessionEventsLogs', 'wikiPages'] as const) {
        const invalid = structuredClone(copy);
        if (missing === 'sessionEventsLogs') invalid.scheduling.sessionEventsLogs = false;
        else invalid.structure.wikiPages = false;
        let code = 0;
        await duplicateCampaignHandler({ params: { id: campaign.id }, user: owner, body: { name: 'Invalid audio clone', copy: invalid } } as unknown as AuthenticatedRequest,
          { status(status: number) { code = status; return this; }, json() {} } as unknown as Response);
        assert.equal(code, 400);
      }
      const input = { sourceCampaignId: campaign.id, ownerUserId: owner.id, name: 'Preflight audio clone', discoverability: 'PRIVATE', copy };
      const sourceAsset = await prisma.asset.findUniqueOrThrow({ where: { id: file.assetId } });
      await prisma.asset.update({ where: { id: sourceAsset.id }, data: { url: '/uploads/nonexistent-clone-audio.wav' } });
      try {
        await assert.rejects(() => duplicateCampaign(input), (error: unknown) => error instanceof AudioError && error.code === 'media_missing');
        assert.equal(await prisma.campaign.count({ where: { name: input.name } }), 0);
      } finally { await prisma.asset.update({ where: { id: sourceAsset.id }, data: { url: sourceAsset.url } }); }
      const driver = getActiveStorageDriver();
      const read = t.mock.method(driver, 'openRead', async () => ({ type: 'redirect' as const, url: 'https://example.invalid/media' }));
      try {
        await assert.rejects(() => duplicateCampaign(input), (error: unknown) => error instanceof AudioError && error.code === 'protected_stream_required');
        assert.equal(await prisma.campaign.count({ where: { name: input.name } }), 0);
      } finally { read.mock.restore(); }
      const before = fs.readdirSync(env.uploadsDir).sort();
      const original = driver.put.bind(driver);
      const written: string[] = [];
      const failure = new Error('clone-storage-fixture');
      const put = t.mock.method(driver, 'put', async (item: Parameters<typeof driver.put>[0]) => {
        const result = await original(item); written.push(item.key);
        if (written.length === 2) throw failure;
        return result;
      });
      try {
        await assert.rejects(() => duplicateCampaign(input), (error: unknown) => error === failure);
        assert.equal(written.length, 2);
        assert.equal(await prisma.campaign.count({ where: { name: input.name } }), 0);
        for (const key of written) assert.equal(await driver.exists(key), false);
        assert.deepEqual(fs.readdirSync(env.uploadsDir).sort(), before);
        assert.ok(fs.existsSync(path.join(env.uploadsDir, path.basename(sourceAsset.url))));
      } finally { put.mock.restore(); }
      const cloned = await duplicateCampaign({ ...input, name: 'Complete audio clone' });
      try {
        const audioClone = await prisma.sessionRecording.findFirstOrThrow({ where: { campaignId: cloned.campaignId }, include: { files: true } });
        assert.equal(audioClone.files.length, 2);
        assert.equal(audioClone.consentAcknowledgedAt?.toISOString(), recording.consentAcknowledgedAt);
        assert.ok(audioClone.files.every((entry) => entry.assetId !== file.assetId));
        assert.equal(await prisma.processingCampaignGrant.count({ where: { campaignId: cloned.campaignId } }), 0);
      } finally {
        await deleteCampaignAssetFiles(cloned.campaignId);
        await prisma.campaign.delete({ where: { id: cloned.campaignId } });
      }
    });
    await t.test('streamed archive preserves media and audio manifest; clone copies isolated assets without grants', async () => {
      const payload = await buildSessionAudioBackup(campaign.id);
      const filename = path.join(env.uploadsDir, 'audio-test.zip');
      await pipeline(streamCampaignBackupZip([{ path: 'sovereign/audio.json', content: JSON.stringify(payload) },
        { path: 'media.wav', content: '', sourcePath: path.join(env.uploadsDir, path.basename((await prisma.asset.findUnique({ where: { id: file.assetId } }))!.url)) }]), fs.createWriteStream(filename));
      const staged = await stageBackupZip(filename);
      const stagingDir = path.join(env.uploadsDir, '.backup-staging');
      const stagedRoot = path.dirname(staged.file('media.wav')!.sourcePath);
      try {
        assert.equal(path.dirname(stagedRoot), stagingDir);
        assert.equal(staged.file('media.wav')?.size, wav.length);
        assert.ok(JSON.parse(await staged.file('sovereign/audio.json')!.async('string')).recordings.length);
        const concurrent = await stageBackupZip(filename);
        const concurrentRoot = path.dirname(concurrent.file('media.wav')!.sourcePath);
        try { assert.notEqual(concurrentRoot, stagedRoot); }
        finally { await concurrent.close(); }
        assert.equal(fs.existsSync(concurrentRoot), false);
      } finally { await staged.close(); }
      assert.equal(fs.existsSync(stagedRoot), false);
      const stagingBeforeFailure = fs.readdirSync(stagingDir).sort();
      await assert.rejects(() => stageBackupZip(filename, 1), (error: unknown) => error instanceof AudioError && error.code === 'backup_limit_exceeded');
      assert.deepEqual(fs.readdirSync(stagingDir).sort(), stagingBeforeFailure);
      const targetPage = await prisma.wikiPage.create({ data: { campaignId: other.id, title: 'Session 1', visibility: 'Party', blocks: [] } });
      await cloneSessionAudio(campaign.id, other.id, new Map([[page.id, targetPage.id]]));
      const cloned = await prisma.sessionRecording.findFirst({ where: { campaignId: other.id }, include: { files: true, transcript: true } });
      assert.ok(cloned); assert.notEqual(cloned.files[0].assetId, file.assetId);
      assert.equal(cloned.consentAcknowledgedAt?.toISOString(), recording.consentAcknowledgedAt);
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
      let restoreTaskId = '';
      const restoreRequest = { campaign: { campaignId: campaign.id, campaignHandle: campaign.handle }, user: owner,
        body: { uploadId: backupUpload.id } } as CampaignScopedRequest & AuthenticatedRequest;
      const sourceAsset = await prisma.asset.findUniqueOrThrow({ where: { id: finalized.assetId } });
      const transaction = prisma.$transaction;
      prisma.$transaction = async () => { throw new Error('restore-handoff-fixture'); };
      try {
        let failedCode = 0;
        await restoreCampaignBackup(restoreRequest, { status(code: number) { failedCode = code; return this; }, json() {} } as unknown as Response);
        assert.equal(failedCode, 400);
        assert.equal((await prisma.assetUploadSession.findUnique({ where: { id: backupUpload.id } }))?.status, 'complete');
        assert.ok(fs.existsSync(path.join(env.uploadsDir, path.basename(sourceAsset.url))));
        assert.ok(await prisma.asset.findUnique({ where: { id: finalized.assetId } }));
      } finally { prisma.$transaction = transaction; }
      const restoreResponse = { status(code: number) { assert.equal(code, 202); return this; },
        json(body: { taskId: string }) { restoreTaskId = body.taskId; } } as unknown as Response;
      await restoreCampaignBackup(restoreRequest, restoreResponse);
      assert.equal(await prisma.asset.findUnique({ where: { id: finalized.assetId } }), null);
      const consumed = await prisma.assetUploadSession.findUnique({ where: { id: backupUpload.id } });
      assert.equal(consumed?.status, 'consumed'); assert.equal(consumed?.assetId, null);
      let replayCode = 0;
      await restoreCampaignBackup(restoreRequest, { status(code: number) { replayCode = code; return this; }, json() {} } as unknown as Response);
      assert.equal(replayCode, 409);
      assert.equal((await api(owner.id, `${uploads}/${backupUpload.id}/finalize`, 'POST', {})).status, 410);
      for (let attempt = 0; attempt < 500 && !['COMPLETED', 'FAILED'].includes(getBackgroundTask(restoreTaskId)?.status ?? ''); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(getBackgroundTask(restoreTaskId)?.status, 'COMPLETED', getBackgroundTask(restoreTaskId)?.errorMessage ?? 'Restore did not complete');
      const restored = await prisma.sessionRecording.findFirst({ where: { campaignId: campaign.id }, include: { files: true, chapters: true, transcript: true } });
      assert.ok(restored); assert.equal(restored.files.length, 2); assert.equal(restored.chapters[0].startMs, 1500);
      assert.ok(restored.transcript?.publishedRevisionId); recording = restored;
    });
    await t.test('referenced assets reject standalone deletion but campaign deletion cascades recording files', async () => {
      const files = await prisma.sessionRecordingFile.findMany({ where: { recording: { campaignId: other.id } } });
      assert.ok(files.length > 0);
      await assert.rejects(() => prisma.asset.delete({ where: { id: files[0].assetId } }),
        (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'P2003');
      await prisma.campaign.delete({ where: { id: other.id } });
      assert.equal(await prisma.sessionRecordingFile.count({ where: { id: { in: files.map((file) => file.id) } } }), 0);
      assert.equal(await prisma.asset.count({ where: { id: { in: files.map((file) => file.assetId) } } }), 0);
    });
    await t.test('detaching or deleting does not silently free physical storage', async () => {
      const asset = await prisma.asset.findUnique({ where: { id: file.assetId } }); assert.equal(asset?.sizeBytes, BigInt(wav.length));
      await prisma.sessionRecording.delete({ where: { id: recording.id } });
      assert.ok(await prisma.asset.findUnique({ where: { id: file.assetId } }));
      assert.equal((await api(admin.id, `/assets/${file.assetId}`)).status, 404);
    });
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
});
