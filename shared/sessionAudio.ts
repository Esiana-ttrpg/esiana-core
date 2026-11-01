/** Shared session media contracts. All times are integer milliseconds. */
export const AUDIO_FORMATS = ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac'] as const;
export const RECORDING_VISIBILITIES = ['campaign', 'staff', 'uploader_and_managers'] as const;
export type RecordingVisibility = typeof RECORDING_VISIBILITIES[number];
export const PROCESSING_CAPABILITIES = [
  'audio.transcribe', 'text.generate', 'text.generate.structured', 'text.embed',
  'image.generate', 'speech.synthesize',
] as const;
export type ProcessingCapability = typeof PROCESSING_CAPABILITIES[number];
export const AUDIO_DEFAULTS = {
  enabled: true, transcriptionEnabled: false, maxFileBytes: '1073741824',
  maxSessionBytes: '5368709120', maxCampaignBytes: '10737418240',
  maxGlobalBytes: null as string | null, maxTranscriptBytes: 10485760,
  uploadConcurrency: 2, chunkBytes: 8388608, stagingHours: 72,
  allowedFormats: [...AUDIO_FORMATS],
};
export interface TranscriptSegmentInput {
  groupId?: string | null;
  startMs: number | null;
  endMs: number | null;
  text: string;
  speaker?: string | null;
  fileId?: string | null;
  fileStartMs?: number | null;
  fileEndMs?: number | null;
}
export interface RecordingFileView {
  id: string; assetId: string; name: string; order: number; durationMs: number;
  offsetMs: number; sizeBytes: string; format: string;
}
export interface ChapterView {
  id: string; title: string; description: string | null; startMs: number;
  fileId: string; fileStartMs: number; wikiPageId: string | null;
}
export interface RecordingView {
  id: string; title: string; visibility: RecordingVisibility; status: string;
  durationMs: number; revision: number; isPrimary: boolean;
  files: RecordingFileView[]; chapters: ChapterView[];
}
export function fileAtPosition(files: Pick<RecordingFileView, 'id' | 'offsetMs' | 'durationMs'>[], ms: number) {
  if (!Number.isSafeInteger(ms) || ms < 0) throw new Error('Invalid timeline position');
  const file = files.find((f, i) => ms >= f.offsetMs &&
    (ms < f.offsetMs + f.durationMs || (i === files.length - 1 && ms === f.offsetMs + f.durationMs)));
  if (!file) throw new Error('Position is outside the recording');
  return { fileId: file.id, fileStartMs: ms - file.offsetMs };
}
export function calculateOffsets<T extends { durationMs: number }>(files: T[]) {
  let offsetMs = 0;
  return files.map((file, order) => {
    if (!Number.isSafeInteger(file.durationMs) || file.durationMs <= 0) throw new Error('Invalid file duration');
    const result = { ...file, order, offsetMs };
    offsetMs += file.durationMs;
    if (!Number.isSafeInteger(offsetMs)) throw new Error('Recording is too long');
    return result;
  });
}
export function normalizeSegments(input: TranscriptSegmentInput[], durationMs: number): TranscriptSegmentInput[] {
  return input.map((segment) => {
    if (!segment || typeof segment !== 'object' || !(segment.startMs === null || typeof segment.startMs === 'number') ||
      !(segment.endMs === null || typeof segment.endMs === 'number')) throw new Error('Invalid transcript segment');
    if (segment.speaker != null && typeof segment.speaker !== 'string') throw new Error('Invalid transcript segment');
    if (typeof segment.text !== 'string' || !segment.text.trim()) throw new Error('Segment text is required');
    const { startMs, endMs } = segment;
    if ((startMs === null) !== (endMs === null)) throw new Error('Both timestamps are required');
    if (startMs !== null && endMs !== null && (!Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) ||
      startMs < 0 || endMs <= startMs || endMs > durationMs)) throw new Error('Segment is outside the recording');
    return { ...segment, text: segment.text.trim() };
  });
}
export function parseTranscript(text: string, format: 'txt' | 'srt' | 'vtt' | 'json'): TranscriptSegmentInput[] {
  if (format === 'txt') return text.trim() ? [{ startMs: null, endMs: null, text: text.trim() }] : [];
  if (format === 'json') {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Native JSON must be an array of segments');
    return parsed as TranscriptSegmentInput[];
  }
  const timestamp = (raw: string) => {
    if (!/^(?:\d{2,}:)?[0-5]\d:[0-5]\d[.,]\d{3}$/.test(raw)) throw new Error('Invalid timestamp');
    const parts = raw.replace(',', '.').split(':').map(Number);
    if (parts.length < 2 || parts.length > 3 || parts.some((v) => !Number.isFinite(v))) throw new Error('Invalid timestamp');
    return Math.round(parts.reduce((sum, v) => sum * 60 + v, 0) * 1000);
  };
  const blocks = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n\s*\n/);
  const segments: TranscriptSegmentInput[] = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines.length || /^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
    const index = lines.findIndex((line) => line.includes('-->'));
    if (index < 0) throw new Error('Missing subtitle timestamps');
    const match = lines[index].match(/^(\S+)\s+-->\s+(\S+)/);
    if (!match) throw new Error('Invalid subtitle timestamps');
    segments.push({ startMs: timestamp(match[1]), endMs: timestamp(match[2]), text: lines.slice(index + 1).join('\n') });
  }
  return segments;
}
