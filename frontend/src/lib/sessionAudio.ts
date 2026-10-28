import { apiFetch } from './api';
export type { RecordingView, RecordingFileView, ChapterView, TranscriptSegmentInput } from '@shared/sessionAudio';
export const audioBase = (campaign: string) => `/campaigns/${encodeURIComponent(campaign)}/audio`;
export const assetUploadBase = (campaign: string) => `/campaigns/${encodeURIComponent(campaign)}/asset-uploads`;
export function audioRequest<T>(campaign: string, path: string, method = 'GET', body?: unknown, headers?: Record<string, string>): Promise<T> {
  return apiFetch<T>(`${audioBase(campaign)}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(headers ? { headers: { 'Content-Type': 'application/json', ...headers } } : {}) });
}
export interface AudioConfiguration {
  enabled: boolean; transcriptionEnabled: boolean; allowContributors: boolean; allowChapters: boolean;
  allowTranscripts: boolean; allowPov: boolean; defaultVisibility: string;
  defaultConnectionId: string | null; defaultModelId: string | null; maxStorageBytes: string | null;
  monthlyRequests: number | null; monthlyDurationMs: string | null;
}
export interface AudioSettingsPayload {
  usage?: { storageBytes: string; fileCount: number };
  settings: AudioConfiguration; capabilities: string[];
  global: { enabled: boolean; transcriptionEnabled: boolean; maxFileBytes: string; maxSessionBytes: string; maxCampaignBytes: string; chunkBytes: number };
}
export interface ProviderModel { id: string; key: string; name: string; enabled: boolean; capabilities: string[] }
export interface ProviderConnection {
  requiresModel?: boolean;
  monthlyRequests: number | null; monthlyDurationMs: string | null;
  id: string; name: string; protocol: string; enabled: boolean; status: string;
  capabilities: string[]; models: ProviderModel[]; endpoint?: string; allowPrivateNetwork?: boolean;
  hasCredential: boolean; concurrency: number; timeoutSeconds: number; maxRequestBytes: string;
  formats: string[]; operatorLabel: string | null; billingLabel: string | null;
}
export interface NativeTranscript {
  revision: number; publishedRevisionId: string | null;
  revisions: { id: string; source: string; createdAt: string }[];
  current: { id: string; source: string; language: string | null; segments: import('@shared/sessionAudio').TranscriptSegmentInput[] } | null;
}
export function formatAudioTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
