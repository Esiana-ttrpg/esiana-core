import { type CampaignCapability } from './capabilities.js';
/** Grants when actor.userId === campaign.campaignOwnerUserId */
export declare const CAMPAIGN_ADMIN_CAPABILITIES: readonly CampaignCapability[];
export declare function campaignAdminCapabilitiesFor(isCampaignOwner: boolean): ReadonlySet<CampaignCapability>;
//# sourceMappingURL=campaignAdminGrants.d.ts.map