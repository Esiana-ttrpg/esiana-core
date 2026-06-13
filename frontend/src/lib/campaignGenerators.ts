import { apiFetch } from '@/lib/api';

export interface GeneratorPresetCard {
  id: string;
  label: string;
  description: string;
  defaultSeed?: string;
  attachCampaignPlugins?: string[];
}

export interface CampaignGeneratorCard {
  pluginId: string;
  pluginName: string;
  preset: GeneratorPresetCard;
}

export interface CampaignGeneratorsResponse {
  generators: CampaignGeneratorCard[];
}

export async function fetchCampaignGenerators(): Promise<CampaignGeneratorCard[]> {
  const data = await apiFetch<CampaignGeneratorsResponse>('/plugins/campaign-generators');
  return data.generators ?? [];
}

export type CampaignSourceKind =
  | 'blank'
  | 'obsidian'
  | 'esiana-backup'
  | 'generator';

export interface WizardGeneratorSelection {
  pluginId: string;
  presetId: string;
  seed?: string;
  density?: 'quiet' | 'active' | 'obsessive';
  attachCampaignPlugins?: string[];
}
