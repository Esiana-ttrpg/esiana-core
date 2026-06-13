import { apiFetch } from './api';
import type {
  LatestVisitResponse,
  NarrativeSnapshotListItem,
  RegionDiffV1,
  VisitSuggestion,
} from '@/types/visitSnapshots';

export async function markPartyVisited(
  campaignHandle: string,
  locationPageId: string,
): Promise<{ visit: Record<string, string> }> {
  return apiFetch(`/campaigns/${campaignHandle}/locations/${locationPageId}/visits`, {
    method: 'POST',
  });
}

export async function fetchLatestVisit(
  campaignHandle: string,
  locationPageId: string,
): Promise<LatestVisitResponse> {
  return apiFetch(`/campaigns/${campaignHandle}/locations/${locationPageId}/visits/latest`);
}

export async function fetchSinceLastVisit(
  campaignHandle: string,
  locationPageId: string,
  perspective?: 'GAMEMASTER',
): Promise<RegionDiffV1> {
  const qs = perspective === 'GAMEMASTER' ? '?perspective=dm' : '';
  return apiFetch(
    `/campaigns/${campaignHandle}/locations/${locationPageId}/since-last-visit${qs}`,
  );
}

export async function fetchVisitSuggestions(
  campaignHandle: string,
  locationPageId: string,
): Promise<{ suggestions: VisitSuggestion[] }> {
  return apiFetch(
    `/campaigns/${campaignHandle}/locations/${locationPageId}/visit-suggestions`,
  );
}

export async function promoteVisitSuggestion(
  campaignHandle: string,
  locationPageId: string,
  suggestionId: string,
): Promise<{ visit: Record<string, string> }> {
  return apiFetch(
    `/campaigns/${campaignHandle}/locations/${locationPageId}/visit-suggestions/${suggestionId}/promote`,
    { method: 'POST' },
  );
}

export async function dismissVisitSuggestion(
  campaignHandle: string,
  locationPageId: string,
  suggestionId: string,
): Promise<void> {
  await apiFetch(
    `/campaigns/${campaignHandle}/locations/${locationPageId}/visit-suggestions/${suggestionId}/dismiss`,
    { method: 'POST' },
  );
}

export async function createMilestoneSnapshot(
  campaignHandle: string,
  body: { label?: string; anchorLocationPageId?: string },
): Promise<{ snapshot: Record<string, string | null> }> {
  return apiFetch(`/campaigns/${campaignHandle}/narrative-snapshots`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchNarrativeSnapshots(
  campaignHandle: string,
  opts?: { comparableOnly?: boolean },
): Promise<{ snapshots: NarrativeSnapshotListItem[] }> {
  const search = new URLSearchParams();
  if (opts?.comparableOnly) {
    search.set('comparableOnly', 'true');
  }
  const qs = search.toString();
  return apiFetch(
    `/campaigns/${campaignHandle}/narrative-snapshots${qs ? `?${qs}` : ''}`,
  );
}

export async function compareSnapshots(
  campaignHandle: string,
  fromId: string,
  toId: string,
  perspective?: 'GAMEMASTER',
): Promise<RegionDiffV1> {
  const search = new URLSearchParams({ from: fromId, to: toId });
  if (perspective === 'GAMEMASTER') search.set('perspective', 'GAMEMASTER');
  return apiFetch(
    `/campaigns/${campaignHandle}/narrative-snapshots/compare?${search.toString()}`,
  );
}
