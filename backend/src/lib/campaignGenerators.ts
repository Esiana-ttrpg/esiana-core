export interface CampaignGeneratorCard {
  pluginId: string;
  pluginName: string;
  preset: {
    id: string;
    label: string;
    description: string;
    defaultSeed?: string;
    attachCampaignPlugins?: string[];
  };
}

export interface WizardGeneratorSpec {
  pluginId: string;
  presetId: string;
  seed?: string;
  density?: 'quiet' | 'active' | 'obsessive';
  attachCampaignPlugins?: string[];
}
