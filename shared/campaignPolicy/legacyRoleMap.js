"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyCampaignMemberRoles = void 0;
exports.legacyRoleToMembershipRole = legacyRoleToMembershipRole;
exports.wasLegacyPlayerRole = wasLegacyPlayerRole;
exports.wasLegacyDmRole = wasLegacyDmRole;
const membershipRoles_js_1 = require("./membershipRoles.js");
/** Legacy CampaignMember.role strings before campaign access framework migration. */
exports.LegacyCampaignMemberRoles = {
    DM: 'DM',
    CO_DM: 'Co-DM',
    MEMBER: 'Member',
    PLAYER: 'Player',
    VIEWER: 'Viewer',
};
const LEGACY_TO_MEMBERSHIP = {
    [exports.LegacyCampaignMemberRoles.DM]: membershipRoles_js_1.MembershipRoles.GAMEMASTER,
    [exports.LegacyCampaignMemberRoles.CO_DM]: membershipRoles_js_1.MembershipRoles.WRITER,
    [exports.LegacyCampaignMemberRoles.MEMBER]: membershipRoles_js_1.MembershipRoles.PARTICIPANT,
    [exports.LegacyCampaignMemberRoles.PLAYER]: membershipRoles_js_1.MembershipRoles.PARTICIPANT,
    [exports.LegacyCampaignMemberRoles.VIEWER]: membershipRoles_js_1.MembershipRoles.OBSERVER,
};
function legacyRoleToMembershipRole(legacy) {
    if (legacy in LEGACY_TO_MEMBERSHIP) {
        return LEGACY_TO_MEMBERSHIP[legacy];
    }
    if (legacy === membershipRoles_js_1.MembershipRoles.GAMEMASTER ||
        legacy === membershipRoles_js_1.MembershipRoles.WRITER ||
        legacy === membershipRoles_js_1.MembershipRoles.PARTICIPANT ||
        legacy === membershipRoles_js_1.MembershipRoles.OBSERVER) {
        return legacy;
    }
    return null;
}
function wasLegacyPlayerRole(legacy) {
    return legacy === exports.LegacyCampaignMemberRoles.PLAYER;
}
function wasLegacyDmRole(legacy) {
    return legacy === exports.LegacyCampaignMemberRoles.DM;
}
//# sourceMappingURL=legacyRoleMap.js.map