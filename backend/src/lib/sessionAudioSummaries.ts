import { prisma } from './prisma.js';
import { canReadRecording } from '../../../shared/processingPolicy.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import type { CampaignContext } from '../types/api.js';
export interface AudioSummary { recordingCount: number; durationMs: number; transcriptAvailable: boolean; processing: boolean }
export async function sessionAudioSummaries(ctx: CampaignContext, userId: string | undefined) {
  const rows = await prisma.sessionRecording.findMany({ where: { campaignId: ctx.campaignId },
    include: { timeline: { select: { wikiPage: { select: { visibility: true } } } },
      transcript: { select: { publishedRevisionId: true } }, jobs: { where: { status: { in: ['queued', 'running'] } }, select: { id: true } } } });
  const summaries = new Map<string, AudioSummary>();
  for (const row of rows) {
    const staff = ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW), visibility = row.timeline.wikiPage.visibility;
    if (!canReadRecording({ member: ctx.isMember, sessionVisible: staff || visibility === 'Public' ||
      (visibility === 'Party' && ctx.capabilities.has(C.WIKI_VIEW_PARTY)), staff,
      manager: ctx.capabilities.has(C.AUDIO_MANAGE), uploader: row.uploadedByUserId === userId, visibility: row.visibility })) continue;
    const summary = summaries.get(row.timelineId) ?? { recordingCount: 0, durationMs: 0, transcriptAvailable: false, processing: false };
    summary.recordingCount++; summary.durationMs += row.durationMs;
    summary.transcriptAvailable ||= Boolean(row.transcript?.publishedRevisionId);
    summary.processing ||= row.jobs.length > 0; summaries.set(row.timelineId, summary);
  }
  return summaries;
}
