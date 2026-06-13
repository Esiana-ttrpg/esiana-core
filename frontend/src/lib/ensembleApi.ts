import type { EnsembleConfig } from './ensembleConfig';

export type EnsembleBundleMember = {
  userId: string;
  playerLabel: string;
  identityPageId: string | null;
};

export type EnsembleBundleQuestPursuit = {
  id: string;
  title: string;
  questStatus: string;
  snippet: string | null;
};

export type EnsembleBundle = {
  config: EnsembleConfig;
  members: EnsembleBundleMember[];
  pursuits: EnsembleBundleQuestPursuit[];
  campaignName: string;
};

export async function fetchEnsembleBundle(
  campaignHandle: string,
): Promise<EnsembleBundle> {
  const response = await fetch(`/api/campaigns/${campaignHandle}/ensemble`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Failed to load party');
  }
  return response.json() as Promise<EnsembleBundle>;
}

export async function updateEnsembleConfigApi(
  campaignHandle: string,
  config: EnsembleConfig,
): Promise<{ config: EnsembleConfig }> {
  const response = await fetch(`/api/campaigns/${campaignHandle}/ensemble`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Failed to save party settings');
  }
  return response.json() as Promise<{ config: EnsembleConfig }>;
}
