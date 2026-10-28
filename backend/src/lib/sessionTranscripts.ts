import type { Prisma } from './prismaClient.js';
import { prisma } from './prisma.js';
import { randomUUID } from 'node:crypto';
import { assertAudio } from './audioCore.js';
import { fileAtPosition, normalizeSegments, type TranscriptSegmentInput } from '../../../shared/sessionAudio.js';

export function anchorSegments(segments: TranscriptSegmentInput[], files: { id: string; offsetMs: number; durationMs: number }[], durationMs: number) {
  return normalizeSegments(segments, durationMs).flatMap<TranscriptSegmentInput>((segment) => {
    const groupId = typeof segment.groupId === 'string' && segment.groupId.length <= 100 ? segment.groupId : randomUUID();
    const clean = { text: segment.text, startMs: segment.startMs, endMs: segment.endMs, speaker: segment.speaker ?? null, groupId };
    if (segment.startMs === null || segment.endMs === null) return [{ ...clean, fileId: null, fileStartMs: null, fileEndMs: null }];
    return files.filter((f) => segment.startMs! < f.offsetMs + f.durationMs && segment.endMs! > f.offsetMs).map((f) => {
      const startMs = Math.max(segment.startMs!, f.offsetMs), endMs = Math.min(segment.endMs!, f.offsetMs + f.durationMs);
      return { ...clean, startMs, endMs, fileId: f.id, fileStartMs: startMs - f.offsetMs, fileEndMs: endMs - f.offsetMs };
    });
  });
}
export async function createTranscriptRevision(input: {
  recordingId: string; userId: string; expectedRevision: number; source: 'manual' | 'import' | 'provider';
  language?: string | null; segments: TranscriptSegmentInput[]; connectionId?: string; modelId?: string; jobId?: string;
}, db: Prisma.TransactionClient = prisma) {
  const recording = await db.sessionRecording.findUnique({ where: { id: input.recordingId }, include: { files: { orderBy: { order: 'asc' } } } });
  assertAudio(recording, 404, 'recording_not_found');
  const transcript = await db.sessionTranscript.upsert({ where: { recordingId: input.recordingId }, create: { recordingId: input.recordingId }, update: {} });
  const updated = await db.sessionTranscript.updateMany({ where: { id: transcript.id, revision: input.expectedRevision }, data: { revision: { increment: 1 } } });
  assertAudio(updated.count === 1, 409, 'transcript_revision_conflict');
  const segments = anchorSegments(input.segments, recording.files, recording.durationMs);
  return db.sessionTranscriptRevision.create({ data: { transcriptId: transcript.id, source: input.source,
    language: input.language, createdByUserId: input.userId, providerConnectionId: input.connectionId,
    providerModelId: input.modelId, sourceJobId: input.jobId,
    segments: { create: segments.map((segment, order) => ({ ...segment, order })) } }, include: { segments: { orderBy: { order: 'asc' } } } });
}
export { fileAtPosition };
