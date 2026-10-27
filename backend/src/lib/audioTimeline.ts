import { prisma } from './prisma.js';
import { assertAudio } from './audioCore.js';
import { calculateOffsets } from '../../../shared/sessionAudio.js';
import type { TranscriptSegmentInput } from '../../../shared/sessionAudio.js';
import { createTranscriptRevision } from './sessionTranscripts.js';

export interface TimelineResolution { fileId: string; startMs: number; endMs?: number }
export async function previewAudioTimeline(recordingId: string, fileIds: string[]) {
  const recording = await prisma.sessionRecording.findUnique({ where: { id: recordingId }, include: {
    files: true, chapters: true, transcript: { include: { revisions: { include: { segments: true }, orderBy: { createdAt: 'desc' } } } },
  } });
  assertAudio(recording, 404, 'recording_not_found');
  assertAudio(new Set(fileIds).size === fileIds.length && fileIds.every((id) => recording.files.some((f) => f.id === id)), 400, 'invalid_file_order');
  const files = calculateOffsets(fileIds.map((id) => recording.files.find((f) => f.id === id)!));
  const affectedChapters = recording.chapters.filter((c) => !files.some((f) => f.id === c.fileId && c.fileStartMs <= f.durationMs));
  const relevant = recording.transcript?.revisions.filter((r, i) => i === 0 || r.id === recording.transcript?.publishedRevisionId) ?? [];
  const affectedSegments = relevant.flatMap((r) => r.segments.filter((s) => s.startMs !== null &&
    !files.some((f) => f.id === s.fileId && s.fileEndMs !== null && s.fileEndMs <= f.durationMs)));
  return { recording, files, affectedChapters, affectedSegments, relevant };
}
export async function commitAudioTimeline(input: {
  recordingId: string; fileIds: string[]; expectedRevision: number; userId: string;
  resolutions: Record<string, TimelineResolution | null>;
}) {
  const preview = await previewAudioTimeline(input.recordingId, input.fileIds);
  const affected = [...preview.affectedChapters, ...preview.affectedSegments];
  assertAudio(affected.every((item) => Object.hasOwn(input.resolutions, item.id)), 409, 'annotation_review_required');
  for (const resolution of Object.values(input.resolutions)) {
    if (!resolution) continue;
    const file = preview.files.find((f) => f.id === resolution.fileId);
    assertAudio(file && resolution.startMs >= 0 && resolution.startMs <= file.durationMs &&
      (resolution.endMs === undefined || (resolution.endMs > resolution.startMs && resolution.endMs <= file.durationMs)), 400, 'invalid_annotation_resolution');
  }
  return prisma.$transaction(async (tx) => {
    const changed = await tx.sessionRecording.updateMany({ where: { id: input.recordingId, revision: input.expectedRevision },
      data: { revision: { increment: 1 }, durationMs: preview.files.reduce((sum, f) => sum + f.durationMs, 0), status: preview.files.length ? 'ready' : 'uploading' } });
    assertAudio(changed.count && preview.recording.revision === input.expectedRevision, 409, 'recording_revision_conflict');
    const currentTranscript = await tx.sessionTranscript.findUnique({ where: { recordingId: input.recordingId } });
    assertAudio((currentTranscript?.revision ?? 0) === (preview.recording.transcript?.revision ?? 0), 409, 'transcript_revision_conflict');
    await tx.sessionRecordingFile.deleteMany({ where: { recordingId: input.recordingId, id: { notIn: input.fileIds } } });
    for (const f of preview.files) await tx.sessionRecordingFile.update({ where: { id: f.id }, data: { order: f.order, offsetMs: f.offsetMs } });
    for (const chapter of preview.recording.chapters) {
      const replacement = input.resolutions[chapter.id];
      if (replacement === null) { await tx.sessionAudioChapter.delete({ where: { id: chapter.id } }); continue; }
      const fileId = replacement?.fileId ?? chapter.fileId, local = replacement?.startMs ?? chapter.fileStartMs;
      const file = preview.files.find((f) => f.id === fileId)!;
      await tx.sessionAudioChapter.update({ where: { id: chapter.id }, data: { fileId, fileStartMs: local, startMs: file.offsetMs + local } });
    }
    let transcriptRevision = currentTranscript?.revision ?? 0;
    // Remap the published snapshot first, then retain the current draft as the newest revision.
    for (const revision of [...preview.relevant].reverse()) {
      const segments: TranscriptSegmentInput[] = revision.segments.flatMap<TranscriptSegmentInput>((s) => {
        const replacement = input.resolutions[s.id];
        if (replacement === null) return [];
        if (s.startMs === null) return [{ startMs: null, endMs: null, text: s.text, speaker: s.speaker, groupId: s.groupId }];
        const fileId = replacement?.fileId ?? s.fileId;
        const file = preview.files.find((f) => f.id === fileId)!;
        const start = replacement?.startMs ?? s.fileStartMs!, end = replacement?.endMs ?? s.fileEndMs!;
        assertAudio(end > start && end <= file.durationMs, 400, 'invalid_annotation_resolution');
        return [{ startMs: file.offsetMs + start, endMs: file.offsetMs + end, text: s.text, speaker: s.speaker, groupId: s.groupId }];
      });
      const remapped = await createTranscriptRevision({ recordingId: input.recordingId, userId: input.userId,
        expectedRevision: transcriptRevision++, source: revision.source as 'manual' | 'import' | 'provider',
        language: revision.language, connectionId: revision.providerConnectionId ?? undefined,
        modelId: revision.providerModelId ?? undefined, jobId: revision.sourceJobId ?? undefined, segments }, tx);
      if (revision.id === preview.recording.transcript?.publishedRevisionId)
        await tx.sessionTranscript.update({ where: { id: revision.transcriptId }, data: { publishedRevisionId: remapped.id } });
    }
    return { revision: input.expectedRevision + 1 };
  });
}
