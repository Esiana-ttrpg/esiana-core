import { apiFetch } from './api';
import type {
  ClaimCirculationsResponse,
  FactionGossipResponse,
  LocationRumorsResponse,
  RetractRumorResult,
  SpreadRumorBody,
  SpreadRumorResult,
} from '@/types/rumorEngine';

export async function fetchLocationRumors(
  campaignHandle: string,
  locationPageId: string,
  asOfEpoch?: string,
): Promise<LocationRumorsResponse> {
  const qs = asOfEpoch ? `?asOfEpoch=${encodeURIComponent(asOfEpoch)}` : '';
  return apiFetch(`/campaigns/${campaignHandle}/locations/${locationPageId}/rumors${qs}`);
}

export async function fetchFactionGossip(
  campaignHandle: string,
  orgPageId: string,
  asOfEpoch?: string,
): Promise<FactionGossipResponse> {
  const qs = asOfEpoch ? `?asOfEpoch=${encodeURIComponent(asOfEpoch)}` : '';
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${orgPageId}/gossip${qs}`);
}

export async function spreadRumor(
  campaignHandle: string,
  body: SpreadRumorBody,
): Promise<SpreadRumorResult> {
  return apiFetch(`/campaigns/${campaignHandle}/rumors/spread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function retractRumor(
  campaignHandle: string,
  circulationId: string,
  reason?: string,
): Promise<RetractRumorResult> {
  return apiFetch(`/campaigns/${campaignHandle}/rumors/retract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ circulationId, reason }),
  });
}

export async function fetchClaimCirculations(
  campaignHandle: string,
  claimId: string,
): Promise<ClaimCirculationsResponse> {
  return apiFetch(`/campaigns/${campaignHandle}/lore-claims/${claimId}/circulations`);
}
