import { apiFetch } from './api';

export type EventImportance = 'NOTICE' | 'MINOR' | 'MAJOR';
export interface ChronologySettings {
  id: string;
  campaignId: string;
  manualEventImportance: EventImportance;
  downtimeEventImportance: EventImportance;
  progressionEventImportance: EventImportance;
}

export async function fetchChronologySettings(campaignHandle: string) {
  const data = await apiFetch<{ settings: ChronologySettings }>(`/campaigns/${campaignHandle}/chronology/settings`);
  return data.settings;
}

export async function updateChronologySettings(campaignHandle: string, settings: Partial<Omit<ChronologySettings, 'id' | 'campaignId'>>) {
  const data = await apiFetch<{ settings: ChronologySettings }>(`/campaigns/${campaignHandle}/chronology/settings`, { method: 'PUT', body: JSON.stringify(settings) });
  return data.settings;
}
