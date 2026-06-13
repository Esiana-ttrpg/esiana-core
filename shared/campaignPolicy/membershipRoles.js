"use strict";
/**
 * Narrative/collaboration membership roles (stored on CampaignMember.role).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMBERSHIP_ROLE_UI_LABELS = exports.MEMBERSHIP_ROLE_VALUES = exports.MembershipRoles = void 0;
exports.isMembershipRole = isMembershipRole;
exports.membershipRoleUiLabel = membershipRoleUiLabel;
exports.isElevatedMembershipRole = isElevatedMembershipRole;
exports.MembershipRoles = {
    GAMEMASTER: 'GAMEMASTER',
    WRITER: 'WRITER',
    PARTICIPANT: 'PARTICIPANT',
    OBSERVER: 'OBSERVER',
};
exports.MEMBERSHIP_ROLE_VALUES = Object.values(exports.MembershipRoles);
function isMembershipRole(value) {
    return exports.MEMBERSHIP_ROLE_VALUES.includes(value);
}
/** Display labels only — not used for authorization. */
exports.MEMBERSHIP_ROLE_UI_LABELS = {
    [exports.MembershipRoles.GAMEMASTER]: 'Game Master',
    [exports.MembershipRoles.WRITER]: 'Writer',
    [exports.MembershipRoles.PARTICIPANT]: 'Player',
    [exports.MembershipRoles.OBSERVER]: 'Observer',
};
function membershipRoleUiLabel(role) {
    if (!role)
        return 'Guest';
    return exports.MEMBERSHIP_ROLE_UI_LABELS[role] ?? role;
}
/** Narrative projection: elevated wiki/map/chronology management tier. */
function isElevatedMembershipRole(role) {
    return role === exports.MembershipRoles.GAMEMASTER || role === exports.MembershipRoles.WRITER;
}
//# sourceMappingURL=membershipRoles.js.map