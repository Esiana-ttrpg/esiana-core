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
