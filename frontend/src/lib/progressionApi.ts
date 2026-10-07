import { apiFetch } from '@/lib/api';
import { fetchEras } from './chronologyErasApi';
import type {
  CampaignEra,
  CampaignMomentumState,
} from '@shared/factionMomentumMetadata';
import type { WorldPressureProjection } from '@shared/worldPressureProjection';

export type CampaignMomentumPayload = {
  semanticsVersion: string;
  state: CampaignMomentumState;
  updatedAt: string;
};

export async function fetchCampaignMomentum(
  campaignHandle: string,
): Promise<CampaignMomentumPayload> {
  const { eras } = await fetchEras(campaignHandle);
  return {
    semanticsVersion: 'campaign-momentum-v1', updatedAt: '',
    state: { version: 'campaign-momentum-v1', chronologyOwned: true, eras: eras.map(era => ({
      id: era.id, name: era.name, calendarId: era.calendarId, calendarName: era.calendarName,
      isMasterTime: era.isMasterTime,
      sortOrder: era.sortOrder, isCurrent: era.isCurrent, visibility: era.visibility,
      epochStartMinute: null, epochEndMinute: null, narrativeNote: null,
    })) },
  };
}

export async function updateCampaignMomentum(
  campaignHandle: string,
  input: { worldPressurePaused?: boolean },
): Promise<CampaignMomentumPayload> {
  return apiFetch<CampaignMomentumPayload>(`/campaigns/${campaignHandle}/momentum`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function fetchWorldPressure(
  campaignHandle: string,
): Promise<{ projection: WorldPressureProjection }> {
  return apiFetch<{ projection: WorldPressureProjection }>(
    `/campaigns/${campaignHandle}/world-pressure`,
  );
}

export async function fetchWorldPressurePreview(
  campaignHandle: string,
  targetEpochMinute: string,
): Promise<{
  projection: WorldPressureProjection;
  targetEpochMinute: string;
  resolvedEraId: string;
}> {
  const params = new URLSearchParams({ targetEpochMinute });
  return apiFetch<{
    projection: WorldPressureProjection;
    targetEpochMinute: string;
    resolvedEraId: string;
  }>(`/campaigns/${campaignHandle}/world-pressure/preview?${params.toString()}`);
}

export type PacingHookSummary = {
  hookId: string;
  status: string;
  summary: string | null;
};

export type PacingSimulationRunSummary = {
  id: string;
  source: string;
  sourceRef: string | null;
  previousEpochMinute: string;
  nextEpochMinute: string;
  createdAt: string;
  advanceMagnitude: string | null;
  elapsedMinutes: string | null;
  hookSummaries: PacingHookSummary[];
  worldAdvanceChronologyEventId: string | null;
  nearbySnapshotCount: number;
};

export async function fetchPacingSimulationRuns(
  campaignHandle: string,
): Promise<{ runs: PacingSimulationRunSummary[] }> {
  return apiFetch<{ runs: PacingSimulationRunSummary[] }>(
    `/campaigns/${campaignHandle}/pacing/simulation-runs`,
  );
}
