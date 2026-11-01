import { assertAudio } from './audioCore.js';
import { transcribeHttp, testProviderConnection } from './transcriptionHttp.js';

/** Capability-specific adapters share connection policy, not a universal operation signature. */
export interface TranscriptionProviderAdapter {
  transcribe: typeof transcribeHttp;
  testConnection: typeof testProviderConnection;
}
const transcriptionAdapters = new Map<string, TranscriptionProviderAdapter>([
  ['whisper_cpp', { transcribe: transcribeHttp, testConnection: testProviderConnection }],
  ['openai_transcription', { transcribe: transcribeHttp, testConnection: testProviderConnection }],
]);
export function registerTranscriptionAdapter(protocol: string, adapter: TranscriptionProviderAdapter) {
  assertAudio(!transcriptionAdapters.has(protocol), 409, 'processing_adapter_already_registered');
  transcriptionAdapters.set(protocol, adapter);
}
export function transcriptionAdapter(protocol: string) {
  const adapter = transcriptionAdapters.get(protocol);
  assertAudio(adapter, 409, 'transcription_adapter_unavailable');
  return adapter;
}
