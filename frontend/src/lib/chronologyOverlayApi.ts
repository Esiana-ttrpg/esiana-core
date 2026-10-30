import type { ConvergenceOverlayBundle } from '@/types/chronologyOverlay';
import { apiFetch } from './api';

export type { ConvergenceOverlayBundle, ConvergenceTimelineEntry } from '@/types/chronologyOverlay';

export type FetchChronologyOverlayParams = {
  order?: 'asc' | 'desc';
  importance?: string;
  includeFuture?: boolean;
  windowMode?: string;
  from?: string;
  to?: string;
  domains?: string;
  sessionLinkedOnly?: boolean;
  includeSuppressed?: boolean;
};

export async function fetchChronologyOverlay(
  campaignHandle: string,
  params: FetchChronologyOverlayParams = {},
): Promise<ConvergenceOverlayBundle> {
  const search = new URLSearchParams();
  if (params.order !== undefined) search.set('order', params.order);
  if (params.importance !== undefined) search.set('importance', params.importance);
  if (params.includeFuture !== undefined) search.set('includeFuture', String(params.includeFuture));
  if (params.windowMode) search.set('windowMode', params.windowMode);
  if (params.from !== undefined) search.set('from', params.from);
  if (params.to !== undefined) search.set('to', params.to);
  if (params.domains !== undefined) search.set('domains', params.domains);
  if (params.sessionLinkedOnly) search.set('sessionLinkedOnly', 'true');
  if (params.includeSuppressed) search.set('includeSuppressed', 'true');
  const qs = search.toString();
  return apiFetch<ConvergenceOverlayBundle>(
    `/campaigns/${campaignHandle}/chronology/overlay${qs ? `?${qs}` : ''}`,
  );
}
