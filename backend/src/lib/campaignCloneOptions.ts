/** Granular campaign clone flags (keep in sync with shared/campaignCloneOptions.ts). */

export interface CampaignCloneStructureOptions {
  wikiPages: boolean;
  folderStructure: boolean;
  sidebarLayout: boolean;
}

export interface CampaignCloneRecruitmentOptions {
  settings: boolean;
  tableStyleTags: boolean;
  safety: boolean;
  publicDocs: boolean;
}

export interface CampaignCloneSchedulingOptions {
  calendarStructure: boolean;
  sessionCadence: boolean;
  sessionEventsLogs: boolean;
}

export interface CampaignCloneGameplayOptions {
  characters: boolean;
  inventoryState: boolean;
  mapsAssets: boolean;
  diceHistory: boolean;
}

export interface CampaignCloneCommunityOptions {
  members: boolean;
  joinRequests: boolean;
  chatHistory: boolean;
}

export interface CampaignCloneOptions {
  structure: CampaignCloneStructureOptions;
  recruitment: CampaignCloneRecruitmentOptions;
  scheduling: CampaignCloneSchedulingOptions;
  gameplay: CampaignCloneGameplayOptions;
  community: CampaignCloneCommunityOptions;
}

export function cloneOptionsEqual(
  a: CampaignCloneOptions,
  b: CampaignCloneOptions,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
