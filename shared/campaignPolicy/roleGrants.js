"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_GRANTS = void 0;
exports.roleCapabilitiesFor = roleCapabilitiesFor;
const capabilities_js_1 = require("./capabilities.js");
const membershipRoles_js_1 = require("./membershipRoles.js");
const GM_WRITER_OPERATIONAL = [
    capabilities_js_1.CampaignCapabilities.WORLD_EDIT,
    capabilities_js_1.CampaignCapabilities.WIKI_EDIT,
    capabilities_js_1.CampaignCapabilities.ASSETS_MANAGE,
    capabilities_js_1.CampaignCapabilities.TEMPLATES_MANAGE,
    capabilities_js_1.CampaignCapabilities.CHRONOLOGY_EDIT,
    capabilities_js_1.CampaignCapabilities.DISCOVERY_REVEAL,
    capabilities_js_1.CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
    capabilities_js_1.CampaignCapabilities.RUMOR_MODERATE,
    capabilities_js_1.CampaignCapabilities.NOTES_MODERATE,
];
const PARTICIPANT_BASE = [
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW,
    capabilities_js_1.CampaignCapabilities.WIKI_VIEW_PARTY,
    capabilities_js_1.CampaignCapabilities.JOURNAL_CREATE,
    capabilities_js_1.CampaignCapabilities.CHARACTER_EDIT,
];
const OBSERVER_BASE = [
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW,
    capabilities_js_1.CampaignCapabilities.WIKI_VIEW_PARTY,
];
function roleCapabilitiesFor(role, flags = {}) {
    const caps = new Set();
    if (!role)
        return caps;
    switch (role) {
        case membershipRoles_js_1.MembershipRoles.GAMEMASTER:
            caps.add(capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW);
            caps.add(capabilities_js_1.CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT);
            for (const c of GM_WRITER_OPERATIONAL)
                caps.add(c);
            break;
        case membershipRoles_js_1.MembershipRoles.WRITER:
            caps.add(capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW);
            for (const c of GM_WRITER_OPERATIONAL)
                caps.add(c);
            break;
        case membershipRoles_js_1.MembershipRoles.PARTICIPANT:
            for (const c of PARTICIPANT_BASE)
                caps.add(c);
            if (flags.chronologyContributor &&
                flags.allowPlayerChronologyManagement) {
                caps.add(capabilities_js_1.CampaignCapabilities.CHRONOLOGY_EDIT);
            }
            break;
        case membershipRoles_js_1.MembershipRoles.OBSERVER:
            for (const c of OBSERVER_BASE)
                caps.add(c);
            break;
        default:
            break;
    }
    return caps;
}
exports.ROLE_GRANTS = {
    [membershipRoles_js_1.MembershipRoles.GAMEMASTER]: [
        capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW,
        capabilities_js_1.CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT,
        ...GM_WRITER_OPERATIONAL,
    ],
    [membershipRoles_js_1.MembershipRoles.WRITER]: [
        capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW,
        ...GM_WRITER_OPERATIONAL,
    ],
    [membershipRoles_js_1.MembershipRoles.PARTICIPANT]: [...PARTICIPANT_BASE],
    [membershipRoles_js_1.MembershipRoles.OBSERVER]: [...OBSERVER_BASE],
};
//# sourceMappingURL=roleGrants.js.map