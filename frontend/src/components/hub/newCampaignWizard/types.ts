import type { CampaignDiscoverabilityValue } from '@/types/campaign';
import { CampaignDiscoverability } from '@shared/campaignPolicy/discoverability';
import type { ImportModuleTarget } from '@shared/importSkeletonKeys';

export type MappingTarget = ImportModuleTarget;

export interface FolderMapping {
  sourceFolderName: string;
  targetModule: MappingTarget | '';
  isAutoMatched: boolean;
}

export type CampaignSource =
  | 'blank'
  | 'obsidian'
  | 'kanka'
  | 'esiana-backup'
  | 'contentPack'
  | 'sampleData';

export type TensionKind = 'character' | 'organization' | 'location' | 'unknown';

export interface PartyDraftRow {
  id: string;
  name: string;
  role?: string;
  hook?: string;
}

export interface TensionDraft {
  kind: TensionKind;
  title: string;
  description?: string;
}

export interface NewCampaignWizardPayload {
  identity: {
    title: string;
    description: string;
    gameSystem: string;
    customGameSystemName: string | null;
    coverImage: File | null;
    genreThemes: string[];
  };
  imports: {
    campaignSource: CampaignSource;
    contentPack: { pluginId: string; packId: string } | null;
    sampleDataProfile: { profileId: string } | null;
    importSource: 'none' | 'obsidian' | 'kanka' | 'esiana-backup';
    importFormat: 'obsidian' | 'kanka-json' | null;
    markdownZipFile: File | null;
    backupZipFile: File | null;
    calendarConfigFile: File | null;
    folderMappings: FolderMapping[];
    sampleDataSeed: string;
    sampleDataDensity: 'quiet' | 'active' | 'obsessive';
  };
  foundation: {
    party: PartyDraftRow[];
    partySkipped: boolean;
    tension: TensionDraft | null;
    tensionSkipped: boolean;
  };
  access: {
    discoverability: CampaignDiscoverabilityValue;
  };
  importDefaults: {
    tableExpectations: boolean;
    safetyGuidelines: boolean;
    sessionZero: boolean;
    houseRules: boolean;
    recruitmentPreferences: boolean;
  };
}

export const INITIAL_FOUNDATION: NewCampaignWizardPayload['foundation'] = {
  party: [],
  partySkipped: false,
  tension: null,
  tensionSkipped: false,
};

export const INITIAL_PAYLOAD: NewCampaignWizardPayload = {
  identity: {
    title: '',
    description: '',
    gameSystem: 'dnd-5e',
    customGameSystemName: null,
    coverImage: null,
    genreThemes: [],
  },
  imports: {
    campaignSource: 'blank',
    contentPack: null,
    sampleDataProfile: null,
    importSource: 'none',
    importFormat: null,
    markdownZipFile: null,
    backupZipFile: null,
    calendarConfigFile: null,
    folderMappings: [],
    sampleDataSeed: '',
    sampleDataDensity: 'active',
  },
  foundation: { ...INITIAL_FOUNDATION },
  access: {
    discoverability: CampaignDiscoverability.PRIVATE,
  },
  importDefaults: {
    tableExpectations: false,
    safetyGuidelines: false,
    sessionZero: false,
    houseRules: false,
    recruitmentPreferences: false,
  },
};

export type WizardStepId = 'identity' | 'source' | 'party' | 'tension' | 'review';

export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  optional?: boolean;
}

export function isBlankCampaignSource(source: CampaignSource): boolean {
  return source === 'blank';
}
