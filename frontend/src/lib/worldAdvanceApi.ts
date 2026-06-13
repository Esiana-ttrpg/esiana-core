import { apiFetch } from './api';
import type {
  WorldAdvanceApplyResult,
  WorldAdvanceBatchPayload,
  WorldAdvanceBatchRequest,
  WorldAdvanceEffect,
  WorldAdvancePreview,
} from '@shared/worldAdvance';

export type WorldAdvanceBatchSummary = {
  chronologyEventId: string;
  batchId: string;
  title: string;
  targetEpochMinute: string;
  appliedCount: number;
  effectCount: number;
  headline: string | null;
  createdAt: string;
};

export function previewWorldAdvance(
  campaignHandle: string,
  body: WorldAdvanceBatchRequest,
): Promise<WorldAdvancePreview> {
  return apiFetch<WorldAdvancePreview>(`/campaigns/${campaignHandle}/world-state/preview`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function applyWorldAdvance(
  campaignHandle: string,
  body: WorldAdvanceBatchRequest,
): Promise<WorldAdvanceApplyResult> {
  return apiFetch<WorldAdvanceApplyResult>(`/campaigns/${campaignHandle}/world-state/apply`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listWorldAdvanceBatches(
  campaignHandle: string,
): Promise<{ batches: WorldAdvanceBatchSummary[] }> {
  return apiFetch<{ batches: WorldAdvanceBatchSummary[] }>(
    `/campaigns/${campaignHandle}/world-state/batches`,
  );
}

export type WorldAdvanceBatchDetail = {
  event: { id: string; title: string; targetEpochMinute: string };
  payload: WorldAdvanceBatchPayload | null;
  preview: WorldAdvancePreview | null;
  effects: WorldAdvanceEffect[];
};

export function getWorldAdvanceBatchDetail(
  campaignHandle: string,
  eventId: string,
): Promise<WorldAdvanceBatchDetail> {
  return apiFetch<{
    event: WorldAdvanceBatchDetail['event'];
    payload: WorldAdvanceBatchPayload | null;
    preview: WorldAdvancePreview | null;
  }>(`/campaigns/${campaignHandle}/world-state/batches/${eventId}`).then((raw) => ({
    ...raw,
    effects: raw.payload?.effects ?? [],
  }));
}
