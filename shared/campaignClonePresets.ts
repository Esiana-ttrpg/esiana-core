import type { CampaignCloneOptions } from './campaignCloneOptions';
import { cloneOptionsEqual } from './campaignCloneOptions';

export const CLONE_PRESET_IDS = [
  'fresh-sequel',
  'new-season',
  'world-template',
  'full-copy',
] as const;

export type ClonePresetId = (typeof CLONE_PRESET_IDS)[number];

export type ClonePresetUsed = ClonePresetId | 'custom';

export interface CampaignClonePresetDefinition {
  id: ClonePresetId;
  label: string;
  subtitle: string;
  options: CampaignCloneOptions;
}

const ALL_OFF_RECRUITMENT: CampaignCloneOptions['recruitment'] = {
  settings: false,
  tableStyleTags: false,
  safety: false,
  publicDocs: false,
};

const ALL_ON_RECRUITMENT: CampaignCloneOptions['recruitment'] = {
  settings: true,
  tableStyleTags: true,
  safety: true,
  publicDocs: true,
};

const FRESH_SEQUEL_RECRUITMENT: CampaignCloneOptions['recruitment'] = {
  settings: true,
  tableStyleTags: true,
  safety: true,
  publicDocs: true,
};

const STRUCTURE_ON: CampaignCloneOptions['structure'] = {
  wikiPages: true,
  folderStructure: true,
  sidebarLayout: true,
};

const SCHEDULING_FOUNDATION: CampaignCloneOptions['scheduling'] = {
  calendarStructure: true,
  sessionCadence: true,
  sessionEventsLogs: false,
};

const GAMEPLAY_OFF: CampaignCloneOptions['gameplay'] = {
  characters: false,
  inventoryState: false,
  mapsAssets: false,
  diceHistory: false,
};

const COMMUNITY_OFF: CampaignCloneOptions['community'] = {
  members: false,
  joinRequests: false,
  chatHistory: false,
};

export const DEFAULT_CLONE_PRESET_ID: ClonePresetId = 'fresh-sequel';

export const CAMPAIGN_CLONE_PRESETS: CampaignClonePresetDefinition[] = [
  {
    id: 'fresh-sequel',
    label: 'Fresh Sequel',
    subtitle: 'Rules, lore, calendars, safety',
    options: {
      structure: STRUCTURE_ON,
      recruitment: FRESH_SEQUEL_RECRUITMENT,
      scheduling: SCHEDULING_FOUNDATION,
      gameplay: GAMEPLAY_OFF,
      community: COMMUNITY_OFF,
    },
  },
  {
    id: 'new-season',
    label: 'New Season',
    subtitle: 'Everything except logs and history',
    options: {
      structure: STRUCTURE_ON,
      recruitment: ALL_ON_RECRUITMENT,
      scheduling: SCHEDULING_FOUNDATION,
      gameplay: {
        characters: true,
        inventoryState: true,
        mapsAssets: true,
        diceHistory: false,
      },
      community: COMMUNITY_OFF,
    },
  },
  {
    id: 'world-template',
    label: 'World Template',
    subtitle: 'Wiki and structure only',
    options: {
      structure: STRUCTURE_ON,
      recruitment: ALL_OFF_RECRUITMENT,
      scheduling: {
        calendarStructure: false,
        sessionCadence: false,
        sessionEventsLogs: false,
      },
      gameplay: GAMEPLAY_OFF,
      community: COMMUNITY_OFF,
    },
  },
  {
    id: 'full-copy',
    label: 'Full Copy',
    subtitle: 'Nearly everything',
    options: {
      structure: STRUCTURE_ON,
      recruitment: ALL_ON_RECRUITMENT,
      scheduling: {
        calendarStructure: true,
        sessionCadence: true,
        sessionEventsLogs: true,
      },
      gameplay: {
        characters: true,
        inventoryState: true,
        mapsAssets: true,
        diceHistory: false,
      },
      community: {
        members: true,
        joinRequests: true,
        chatHistory: false,
      },
    },
  },
];

export function resolvePresetToOptions(presetId: ClonePresetId): CampaignCloneOptions {
  const preset = CAMPAIGN_CLONE_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) {
    return resolvePresetToOptions(DEFAULT_CLONE_PRESET_ID);
  }
  return JSON.parse(JSON.stringify(preset.options)) as CampaignCloneOptions;
}

export function detectPresetFromOptions(
  options: CampaignCloneOptions,
): ClonePresetUsed {
  for (const preset of CAMPAIGN_CLONE_PRESETS) {
    if (cloneOptionsEqual(options, preset.options)) {
      return preset.id;
    }
  }
  return 'custom';
}

export function isClonePresetId(value: string): value is ClonePresetId {
  return (CLONE_PRESET_IDS as readonly string[]).includes(value);
}
