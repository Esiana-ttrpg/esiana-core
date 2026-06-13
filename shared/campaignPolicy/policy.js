"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCampaignActor = buildCampaignActor;
exports.resolveActorCapabilities = resolveActorCapabilities;
exports.can = can;
exports.actorDiscoverability = actorDiscoverability;
exports.canAccessCampaignContainer = canAccessCampaignContainer;
exports.canManageOperationalResources = canManageOperationalResources;
exports.canManageChronology = canManageChronology;
exports.canModifyCampaignSettings = canModifyCampaignSettings;
exports.canManageCampaignRoles = canManageCampaignRoles;
exports.isCampaignOwnerActor = isCampaignOwnerActor;
const campaignAdminGrants_js_1 = require("./campaignAdminGrants.js");
const capabilities_js_1 = require("./capabilities.js");
const discoverability_js_1 = require("./discoverability.js");
const legacyRoleMap_js_1 = require("./legacyRoleMap.js");
const membershipRoles_js_1 = require("./membershipRoles.js");
const publicProfile_js_1 = require("./publicProfile.js");
const roleGrants_js_1 = require("./roleGrants.js");
function resolveMembershipRole(role) {
    if (role && (0, membershipRoles_js_1.isMembershipRole)(role))
        return role;
    return (0, legacyRoleMap_js_1.legacyRoleToMembershipRole)(role ?? '') ?? membershipRoles_js_1.MembershipRoles.OBSERVER;
}
function buildCampaignActor(input) {
    const campaign = {
        campaignOwnerUserId: input.campaignOwnerUserId,
        isPublicViewable: input.isPublicViewable,
        isPublic: input.isPublic,
        allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
    };
    if (input.kind === 'anonymous' || !input.userId) {
        return { kind: 'anonymous', campaign };
    }
    return {
        kind: 'member',
        userId: input.userId,
        membershipRole: resolveMembershipRole(input.membershipRole),
        isCampaignOwner: input.userId === input.campaignOwnerUserId,
        campaign,
        memberFlags: { chronologyContributor: input.chronologyContributor },
    };
}
function resolveActorCapabilities(actor) {
    if (actor.kind === 'anonymous') {
        const discoverability = (0, discoverability_js_1.resolveDiscoverability)(actor.campaign);
        if (!(0, discoverability_js_1.allowsAnonymousCampaignView)(discoverability)) {
            return new Set();
        }
        return (0, publicProfile_js_1.publicAnonymousCapabilities)();
    }
    const flags = {
        chronologyContributor: actor.memberFlags?.chronologyContributor,
        allowPlayerChronologyManagement: actor.campaign.allowPlayerChronologyManagement,
    };
    const roleCaps = (0, roleGrants_js_1.roleCapabilitiesFor)(actor.membershipRole, flags);
    const adminCaps = (0, campaignAdminGrants_js_1.campaignAdminCapabilitiesFor)(actor.isCampaignOwner);
    return new Set([...roleCaps, ...adminCaps]);
}
function can(actor, capability, _resource) {
    return resolveActorCapabilities(actor).has(capability);
}
function actorDiscoverability(actor) {
    return (0, discoverability_js_1.resolveDiscoverability)(actor.campaign);
}
function canAccessCampaignContainer(actor) {
    if (actor.kind === 'member')
        return true;
    return can(actor, capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW);
}
function canManageOperationalResources(actor) {
    return can(actor, capabilities_js_1.CampaignCapabilities.WORLD_EDIT);
}
function canManageChronology(actor) {
    return can(actor, capabilities_js_1.CampaignCapabilities.CHRONOLOGY_EDIT);
}
function canModifyCampaignSettings(actor) {
    return can(actor, capabilities_js_1.CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT);
}
function canManageCampaignRoles(actor) {
    return can(actor, capabilities_js_1.CampaignCapabilities.CAMPAIGN_MANAGE_ROLES);
}
function isCampaignOwnerActor(actor) {
    return actor.kind === 'member' && actor.isCampaignOwner;
}
//# sourceMappingURL=policy.js.map