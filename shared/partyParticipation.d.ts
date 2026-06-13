/**
 * Character-level party cast participation (wiki metadata).
 * Separate from CampaignMember.identityPageId (player → character link).
 */
export declare const PartyParticipationRoles: {
    readonly PLAYER_CHARACTER: "PLAYER_CHARACTER";
    readonly COMPANION: "COMPANION";
    readonly NPC_ALLY: "NPC_ALLY";
    readonly GUEST: "GUEST";
};
export type PartyParticipationRole = (typeof PartyParticipationRoles)[keyof typeof PartyParticipationRoles];
export declare const ALL_PARTY_PARTICIPATION_ROLES: readonly PartyParticipationRole[];
export interface PartyParticipation {
    active: boolean;
    role: PartyParticipationRole;
}
export declare const PARTY_PARTICIPATION_ROLE_LABELS: Record<PartyParticipationRole, string>;
/** Sort rank for roster ordering (lower = earlier). */
export declare const PARTY_PARTICIPATION_ROLE_RANK: Record<PartyParticipationRole, number>;
export declare const DEFAULT_PARTY_PARTICIPATION: PartyParticipation;
export declare function normalizePartyParticipationRole(raw: unknown): PartyParticipationRole;
export declare function parsePartyParticipation(metadata: unknown): PartyParticipation;
export declare function normalizePartyParticipationPatch(raw: unknown): PartyParticipation;
export declare function formatPartyParticipationLabel(participation: PartyParticipation): string | null;
/** Whether a character page is on the active party cast. */
export declare function isActivePartyCharacter(metadata: unknown): boolean;
/** Compact read-mode chip label, e.g. "Party · Companion". */
export declare function formatPartyParticipationChip(participation: PartyParticipation): string | null;
//# sourceMappingURL=partyParticipation.d.ts.map