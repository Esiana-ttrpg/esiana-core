/**
 * Campaign-scoped capability primitives.
 * Application administration (SYSTEM_ADMIN) is outside this registry.
 */

export const CampaignCapabilities = {
  CAMPAIGN_VIEW: 'campaign.view',
  CAMPAIGN_DELETE: 'campaign.delete',
  CAMPAIGN_TRANSFER_OWNERSHIP: 'campaign.transfer_ownership',
  CAMPAIGN_MANAGE_ROLES: 'campaign.manage_roles',
  CAMPAIGN_SETTINGS_EDIT: 'campaign.settings.edit',
  CAMPAIGN_VISIBILITY_EDIT: 'campaign.visibility.edit',
  BILLING_MANAGE: 'billing.manage',

  PAGE_CREATE: 'page.create',
  PAGE_EDIT_OWNED: 'page.edit_owned',
  PAGE_EDIT_PARTY: 'page.edit_party',
  PAGE_EDIT_ANY: 'page.edit_any',
  PAGE_VISIBILITY_EDIT: 'page.visibility.edit',

  QUEST_EDIT: 'quest.edit',
  THREAD_EDIT: 'thread.edit',
  MAPS_EDIT: 'maps.edit',
  DOWNTIME_MANAGE: 'downtime.manage',
  ADVENTURE_STORYBOARD_EDIT: 'adventure.storyboard.edit',

  ASSETS_UPLOAD: 'assets.upload',
  ASSETS_DELETE_ANY: 'assets.delete_any',
  ASSETS_DELETE_OWNED: 'assets.delete_owned',
  ASSETS_VIEW: 'assets.view',

  LEDGER_CONTRIBUTE: 'ledger.contribute',

  CHRONOLOGY_EDIT: 'chronology.edit',
  DISCOVERY_REVEAL: 'discovery.reveal',
  NARRATIVE_ELEVATED_VIEW: 'narrative.elevated_view',

  RUMOR_MODERATE: 'rumor.moderate',
  NOTES_MODERATE: 'notes.moderate',

  WIKI_VIEW_PARTY: 'wiki.view_party',

  CODEX_VIEW_PUBLIC: 'codex.view_public',
} as const;

export type CampaignCapability =
  (typeof CampaignCapabilities)[keyof typeof CampaignCapabilities];

export const ALL_CAMPAIGN_CAPABILITIES: readonly CampaignCapability[] =
  Object.values(CampaignCapabilities);
