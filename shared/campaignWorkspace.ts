/**
 * Campaign workspace — canonical stored value on WikiPage.workspace (String column).
 */
export const CampaignWorkspace = {
  CHARACTERS: 'CHARACTERS',
  BESTIARY: 'BESTIARY',
  ANCESTRIES: 'ANCESTRIES',
  ORGANIZATIONS: 'ORGANIZATIONS',
  LOCATIONS: 'LOCATIONS',
  OBJECTS: 'OBJECTS',
  FAMILIES: 'FAMILIES',
  RULES_RESOURCES: 'RULES_RESOURCES',
  ADVENTURES: 'ADVENTURES',
  THREADS: 'THREADS',
  HAVENS: 'HAVENS',
  PROJECTS: 'PROJECTS',
  JOURNALS: 'JOURNALS',
  PAGES: 'PAGES',
  CUSTOM: 'CUSTOM',
} as const;

export type CampaignWorkspace =
  (typeof CampaignWorkspace)[keyof typeof CampaignWorkspace];

export const CAMPAIGN_WORKSPACE_VALUES = Object.values(
  CampaignWorkspace,
) as CampaignWorkspace[];
