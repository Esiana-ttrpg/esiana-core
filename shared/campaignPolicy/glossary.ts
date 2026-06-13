/**
 * Authority layer documentation strings (reused in platform docs).
 */

export const AUTHORITY_LAYER_APPLICATION_ADMIN =
  'application_administration' as const;

export const AUTHORITY_LAYER_CAMPAIGN_ADMIN =
  'campaign_administration' as const;

export const AUTHORITY_LAYER_NARRATIVE = 'narrative_authority' as const;

export const CAMPAIGN_OWNERSHIP_DOC_CALLOUT = `Campaign ownership is scoped strictly to an individual campaign container and is not related to global application administration.

Campaign owners control: campaign deletion, discoverability, membership management, ownership transfer, and future billing/subscription controls.

Application administrators remain a completely separate authority layer outside the campaign permission system.`;
