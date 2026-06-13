import { apiFetch } from '@/lib/api';

export interface CoreImportProviderCard {
  source: 'core';
  id: string;
  label: string;
  description: string;
}

export interface PluginImportProviderCard {
  source: 'plugin';
  id: string;
  pluginId: string;
  providerId: string;
  label: string;
  description: string;
  requiresFile: boolean;
  requiresAuth: boolean;
}

export interface ImportProvidersResponse {
  core: CoreImportProviderCard[];
  plugins: PluginImportProviderCard[];
}

export async function fetchImportProviders(): Promise<ImportProvidersResponse> {
  return apiFetch<ImportProvidersResponse>('/import-providers');
}
