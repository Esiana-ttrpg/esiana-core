import { type CampaignCapability } from './capabilities.js';
import { type CampaignDiscoverabilityValue, type DiscoverabilityInput } from './discoverability.js';
import { type MembershipRole } from './membershipRoles.js';
export type CampaignPolicyContext = {
    campaignOwnerUserId: string;
    allowPlayerChronologyManagement: boolean;
} & DiscoverabilityInput;
export type CampaignActor = {
    kind: 'anonymous';
    campaign: CampaignPolicyContext;
} | {
    kind: 'member';
    userId: string;
    membershipRole: MembershipRole;
    isCampaignOwner: boolean;
    campaign: CampaignPolicyContext;
    memberFlags?: {
        chronologyContributor?: boolean;
    };
};
export declare function buildCampaignActor(input: {
    kind: 'anonymous' | 'member';
    userId?: string | null;
    membershipRole?: string | null;
    campaignOwnerUserId: string;
    isPublicViewable: boolean;
    isPublic: boolean;
    allowPlayerChronologyManagement: boolean;
    chronologyContributor?: boolean;
}): CampaignActor;
export declare function resolveActorCapabilities(actor: CampaignActor): ReadonlySet<CampaignCapability>;
export declare function can(actor: CampaignActor, capability: CampaignCapability, _resource?: unknown): boolean;
export declare function actorDiscoverability(actor: CampaignActor): CampaignDiscoverabilityValue;
export declare function canAccessCampaignContainer(actor: CampaignActor): boolean;
export declare function canManageOperationalResources(actor: CampaignActor): boolean;
export declare function canManageChronology(actor: CampaignActor): boolean;
export declare function canModifyCampaignSettings(actor: CampaignActor): boolean;
export declare function canManageCampaignRoles(actor: CampaignActor): boolean;
export declare function isCampaignOwnerActor(actor: CampaignActor): boolean;
//# sourceMappingURL=policy.d.ts.map