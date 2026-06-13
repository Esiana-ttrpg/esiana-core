"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPAIGN_ADMIN_CAPABILITIES = void 0;
exports.campaignAdminCapabilitiesFor = campaignAdminCapabilitiesFor;
const capabilities_js_1 = require("./capabilities.js");
/** Grants when actor.userId === campaign.campaignOwnerUserId */
exports.CAMPAIGN_ADMIN_CAPABILITIES = [
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_DELETE,
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_TRANSFER_OWNERSHIP,
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_MANAGE_ROLES,
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT,
    capabilities_js_1.CampaignCapabilities.BILLING_MANAGE,
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW,
];
function campaignAdminCapabilitiesFor(isCampaignOwner) {
    if (!isCampaignOwner)
        return new Set();
    return new Set(exports.CAMPAIGN_ADMIN_CAPABILITIES);
}
//# sourceMappingURL=campaignAdminGrants.js.map