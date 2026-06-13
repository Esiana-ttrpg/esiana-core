/**
 * Narrative/collaboration membership roles (stored on CampaignMember.role).
 */
export declare const MembershipRoles: {
    readonly GAMEMASTER: "GAMEMASTER";
    readonly WRITER: "WRITER";
    readonly PARTICIPANT: "PARTICIPANT";
    readonly OBSERVER: "OBSERVER";
};
export type MembershipRole = (typeof MembershipRoles)[keyof typeof MembershipRoles];
export declare const MEMBERSHIP_ROLE_VALUES: readonly MembershipRole[];
export declare function isMembershipRole(value: string): value is MembershipRole;
/** Display labels only — not used for authorization. */
export declare const MEMBERSHIP_ROLE_UI_LABELS: Record<MembershipRole, string>;
export declare function membershipRoleUiLabel(role: MembershipRole | null | undefined): string;
/** Narrative projection: elevated wiki/map/chronology management tier. */
export declare function isElevatedMembershipRole(role: MembershipRole | string | null | undefined): boolean;
//# sourceMappingURL=membershipRoles.d.ts.map