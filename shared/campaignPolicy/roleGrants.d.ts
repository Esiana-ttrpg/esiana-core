import { type CampaignCapability } from './capabilities.js';
import { type MembershipRole } from './membershipRoles.js';
export type MemberCapabilityFlags = {
    chronologyContributor?: boolean;
    allowPlayerChronologyManagement?: boolean;
};
export declare function roleCapabilitiesFor(role: MembershipRole | null | undefined, flags?: MemberCapabilityFlags): ReadonlySet<CampaignCapability>;
export declare const ROLE_GRANTS: Record<MembershipRole, readonly CampaignCapability[]>;
//# sourceMappingURL=roleGrants.d.ts.map