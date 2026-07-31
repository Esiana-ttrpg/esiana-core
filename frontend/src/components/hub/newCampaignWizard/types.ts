import type { CampaignDiscoverabilityValue } from '@/types/campaign';
import { CampaignDiscoverability } from '@shared/campaignPolicy/discoverability';
import { GAME_SYSTEMS } from '@shared/gameSystems';
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

export type ScheduleCadence = 'weekly' | 'biweekly' | 'monthly' | 'custom';

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

export interface StartingLocationDraft {
  mode: 'new' | 'later';
  title?: string;
  description?: string;
}

export interface ScheduleDraft {
  cadence?: ScheduleCadence;
  enabled: boolean;
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
    startingLocation: StartingLocationDraft | null;
    locationSkipped: boolean;
    tension: TensionDraft | null;
    tensionSkipped: boolean;
  };
  schedule: ScheduleDraft | null;
  schedulingSkipped: boolean;
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
  startingLocation: null,
  locationSkipped: false,
  tension: null,
  tensionSkipped: false,
};

const PBTQ_GAME_SYSTEM_CATEGORY = 'Narrative, PbtA & Queer Indie';

export function pickRandomWizardDefaultGameSystem(): string {
  const bucket = Math.floor(Math.random() * 3);
  if (bucket === 0) return 'pathfinder-2e';
  if (bucket === 1) return 'daggerheart';
  const pbtaSlugs = GAME_SYSTEMS.filter((entry) => entry.category === PBTQ_GAME_SYSTEM_CATEGORY).map(
    (entry) => entry.slug,
  );
  if (pbtaSlugs.length === 0) return 'pbta';
  return pbtaSlugs[Math.floor(Math.random() * pbtaSlugs.length)]!;
}

export function createInitialPayload(): NewCampaignWizardPayload {
  return {
    identity: {
      title: '',
      description: '',
      gameSystem: pickRandomWizardDefaultGameSystem(),
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
    schedule: null,
    schedulingSkipped: false,
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
}

/** @deprecated Prefer createInitialPayload() so game system is randomized per session. */
export const INITIAL_PAYLOAD: NewCampaignWizardPayload = createInitialPayload();

export type WizardStepId =
  | 'identity'
  | 'source'
  | 'party'
  | 'location'
  | 'tension'
  | 'scheduling'
  | 'review';

export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  optional?: boolean;
}

export function isBlankCampaignSource(source: CampaignSource): boolean {
  return source === 'blank';
}
