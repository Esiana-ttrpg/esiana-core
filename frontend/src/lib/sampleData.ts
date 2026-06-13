import { apiFetch } from '@/lib/api';

export interface SampleDataProfileCard {
  kind: 'sampleData';
  source: 'core';
  profileId: string;
  label: string;
  description: string;
  defaultSeed: string;
  defaultDensity: 'quiet' | 'active' | 'obsessive';
}

interface SampleDataProfilesResponse {
  profiles: SampleDataProfileCard[];
}

export async function fetchSampleDataProfiles(): Promise<SampleDataProfileCard[]> {
  const data = await apiFetch<SampleDataProfilesResponse>('/sample-data/profiles');
  return data.profiles ?? [];
}

export interface AdminSampleDataStatus {
  enabled: boolean;
  profiles: SampleDataProfileCard[];
}

export async function fetchAdminSampleDataStatus(): Promise<AdminSampleDataStatus> {
  return apiFetch<AdminSampleDataStatus>('/admin/sample-data');
}

export interface AdminGenerateSampleCampaignInput {
  name: string;
  profileId: string;
  seed?: string;
  density?: 'quiet' | 'active' | 'obsessive';
}

export async function adminGenerateSampleCampaign(
  input: AdminGenerateSampleCampaignInput,
): Promise<{ campaign: { id: string; handle: string; name: string }; taskId: string }> {
  return apiFetch('/admin/sample-data/generate-campaign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
