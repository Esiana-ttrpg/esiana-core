import type { Response, NextFunction } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from './prisma.js';
import { buildCampaignContext } from './campaignScopeContext.js';
import { canReadRecording } from '../../../shared/processingPolicy.js';
import { AUDIO_FORMATS } from '../../../shared/sessionAudio.js';
import { CampaignCapabilities as C, type CampaignCapability } from '../../../shared/campaignPolicy/capabilities.js';
import type { CampaignContext } from '../types/api.js';
import type { Prisma } from './prismaClient.js';

export class AudioError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const errorMessages: Record<string, string> = {
  invalid_idempotency_key: 'Use a retry key of 1–200 letters, digits, dots, underscores, colons, or hyphens.',
  idempotency_key_conflict: 'This retry key was already used for a different request. Use a new key for a new operation.',
  idempotent_resource_deleted: 'The resource created by this request was deleted. It will not be recreated by a retry.',
  operation_forbidden: 'You do not have permission for this action.',
  uploads_disabled: 'New recording uploads are disabled for this instance or campaign.',
  default_provider_required: 'Choose a permitted transcription provider in Campaign Audio settings.',
  campaign_not_granted: 'This campaign does not have access to this provider.',
  storage_quota_exceeded: 'This upload exceeds the available audio storage allowance.',
  upload_offset_conflict: 'Upload progress changed. Retry to resume from the server’s saved position.',
  recording_revision_conflict: 'This recording changed. Reload it before applying your changes.',
  transcript_revision_conflict: 'This transcript changed. Reload it before saving a new revision.',
  usage_limit_exceeded: 'This request exceeds the campaign’s processing allowance.',
  provider_usage_limit_exceeded: 'This provider has reached its processing allowance.',
  provider_media_incompatible: 'One or more files exceed the provider’s format or file-size limits.',
};
export function assertAudio(condition: unknown, status: number, code: string): asserts condition {
  if (!condition) throw new AudioError(status, code);
}
export function jsonSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_key, v) => typeof v === 'bigint' ? v.toString() : v));
}
export const audioHandler = (fn: (req: CampaignScopedRequest, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: CampaignScopedRequest, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch((error: unknown) => {
      if (error instanceof AudioError) res.status(error.status).json({ error: errorMessages[error.code] ?? error.code.replaceAll('_', ' '), code: error.code });
      else if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError')
        res.status(400).json({ error: 'Invalid request' });
      else if (error instanceof Error && ['Invalid timeline position', 'Position is outside the recording', 'Segment is outside the recording',
        'Segment text is required', 'Both timestamps are required', 'Invalid transcript segment'].includes(error.message)) res.status(400).json({ error: error.message });
      else res.status(500).json({ error: 'audio_operation_failed' });
    });
  };
export function capability(ctx: CampaignContext, cap: CampaignCapability) {
  assertAudio(ctx.isMember && ctx.capabilities.has(cap), 403, 'operation_forbidden');
}
export async function audioContext(campaignId: string, userId: string): Promise<CampaignContext> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  const member = await prisma.campaignMember.findUnique({ where: { userId_campaignId: { userId, campaignId } } });
  assertAudio(campaign && member, 403, 'campaign_membership_required');
  return buildCampaignContext({ campaignId, campaignHandle: campaign.handle, campaignOwnerUserId: campaign.campaignOwnerUserId,
    discoverability: campaign.discoverability, allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
    userId, membershipRole: member.role, chronologyContributor: member.chronologyContributor, partyId: member.partyId });
}
export async function audioSettings() {
  return prisma.audioSettings.upsert({ where: { id: 'GLOBAL_AUDIO' }, create: { id: 'GLOBAL_AUDIO', enabled: true, allowedFormats: [...AUDIO_FORMATS] }, update: {} });
}
export async function campaignAudioSettings(campaignId: string) {
  return prisma.campaignAudioSettings.upsert({ where: { campaignId }, create: { campaignId, enabled: true }, update: {} });
}
export async function sessionAccess(ctx: CampaignContext, timelineId: string) {
  const timeline = await prisma.campaignSessionTimeline.findFirst({ where: { id: timelineId, campaignId: ctx.campaignId }, include: { wikiPage: true } });
  assertAudio(timeline && ctx.isMember, 404, 'session_not_found');
  const staff = ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW);
  assertAudio(staff || timeline.wikiPage.visibility === 'Public' ||
    (timeline.wikiPage.visibility === 'Party' && ctx.capabilities.has(C.WIKI_VIEW_PARTY)), 404, 'session_not_found');
  return timeline;
}
export async function recordingAccess(ctx: CampaignContext, userId: string, recordingId: string) {
  const recording = await prisma.sessionRecording.findFirst({ where: { id: recordingId, campaignId: ctx.campaignId },
    include: { files: { orderBy: { order: 'asc' } }, chapters: { orderBy: { startMs: 'asc' } }, transcript: true } });
  assertAudio(recording, 404, 'recording_not_found');
  await sessionAccess(ctx, recording.timelineId);
  assertAudio(canReadRecording({ member: ctx.isMember, sessionVisible: true,
    staff: ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW), manager: ctx.capabilities.has(C.AUDIO_MANAGE),
    uploader: recording.uploadedByUserId === userId, visibility: recording.visibility }), 404, 'recording_not_found');
  return recording;
}
export async function authorizeAudioAsset(assetId: string, userId?: string) {
  assertAudio(userId, 403, 'campaign_membership_required');
  const files = await prisma.sessionRecordingFile.findMany({ where: { assetId }, include: { recording: true } });
  // Detached audio remains protected and is only available through authorized storage operations.
  assertAudio(files.length, 404, 'recording_not_found');
  for (const file of files) {
    try {
      const ctx = await audioContext(file.recording.campaignId, userId);
      await recordingAccess(ctx, userId, file.recordingId);
      return file;
    } catch (error) { if (!(error instanceof AudioError)) throw error; }
  }
  throw new AudioError(404, 'recording_not_found');
}
export async function authorizeAudioBackup(campaignId: string, userId: string) {
  const rows = await prisma.sessionRecording.findMany({ where: { campaignId }, select: { id: true } });
  if (!rows.length && !await prisma.asset.count({ where: { campaignId, type: 'SessionAudio' } })) return;
  const ctx = await audioContext(campaignId, userId);
  capability(ctx, C.AUDIO_MANAGE);
  for (const row of rows) await recordingAccess(ctx, userId, row.id);
}
export async function authorizeCampaignExport(campaignId: string, userId?: string) {
  assertAudio(userId, 403, 'campaign_membership_required');
  const ctx = await audioContext(campaignId, userId);
  capability(ctx, C.CAMPAIGN_SETTINGS_EDIT);
  capability(ctx, C.NARRATIVE_ELEVATED_VIEW);
  await authorizeAudioBackup(campaignId, userId);
}
export async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  // A global version write serializes quota/usage reservations on both supported engines.
  return prisma.$transaction(async (tx) => {
    await tx.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { revision: { increment: 1 } } });
    return fn(tx);
  });
}
