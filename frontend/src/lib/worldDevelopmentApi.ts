import { apiFetch } from '@/lib/api';
import type {
  DevelopmentHistoryRow,
  WorldDevelopmentPresentation,
} from '@shared/worldDevelopmentPresentation';
import type { WorldDevelopmentSettings } from '@shared/worldDevelopmentMetadata';
import type { DevelopmentAcceptTarget } from '@shared/worldDevelopmentMetadata';
import type { WorldEventSuggestionTerminalStatus } from '@shared/worldEventSuggestionMetadata';

export async function fetchPendingDevelopments(
  campaignHandle: string,
): Promise<WorldDevelopmentPresentation> {
  return apiFetch<WorldDevelopmentPresentation>(
    `/campaigns/${campaignHandle}/world-development/pending`,
  );
}

export async function fetchDevelopmentHistory(
  campaignHandle: string,
  params?: {
    status?: WorldEventSuggestionTerminalStatus[];
    q?: string;
    from?: string;
    to?: string;
  },
): Promise<{ history: DevelopmentHistoryRow[] }> {
  const search = new URLSearchParams();
  if (params?.status?.length) search.set('status', params.status.join(','));
  if (params?.q) search.set('q', params.q);
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const qs = search.toString();
  return apiFetch<{ history: DevelopmentHistoryRow[] }>(
    `/campaigns/${campaignHandle}/world-development/history${qs ? `?${qs}` : ''}`,
  );
}

import type { WorldDevelopmentSettingsPayload } from '@shared/worldDevelopmentPresentation';

export async function fetchWorldDevelopmentSettings(
  campaignHandle: string,
): Promise<WorldDevelopmentSettingsPayload> {
  return apiFetch(`/campaigns/${campaignHandle}/world-development/settings`);
}

export async function saveWorldDevelopmentSettings(
  campaignHandle: string,
  settings: Partial<WorldDevelopmentSettings>,
): Promise<{ settings: WorldDevelopmentSettings }> {
  return apiFetch(`/campaigns/${campaignHandle}/world-development/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

export async function resolveDevelopmentSuggestion(
  campaignHandle: string,
  id: string,
  input: {
    action: 'accept' | 'dismiss';
    source: 'world_event' | 'reputation';
    acceptTarget?: DevelopmentAcceptTarget;
    title?: string;
    narrative?: string | null;
  },
): Promise<unknown> {
  return apiFetch(`/campaigns/${campaignHandle}/world-development/suggestions/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type SuggestDevelopmentsResult = {
  entitiesScanned: number;
  suggestionsCreated: number;
  autoResolved: number;
  skipReason?: 'disabled' | 'paused' | 'no_pressure_signals' | 'budget_exhausted';
};

export async function suggestOnDemandDevelopments(
  campaignHandle: string,
): Promise<SuggestDevelopmentsResult> {
  return apiFetch<SuggestDevelopmentsResult>(
    `/campaigns/${campaignHandle}/world-development/suggest`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function requeueArchivedDevelopment(
  campaignHandle: string,
  id: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/world-development/suggestions/${id}/requeue`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
