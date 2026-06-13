/**
 * Narrative/collaboration membership roles (stored on CampaignMember.role).
 */

export const MembershipRoles = {
  GAMEMASTER: 'GAMEMASTER',
  WRITER: 'WRITER',
  PARTICIPANT: 'PARTICIPANT',
  OBSERVER: 'OBSERVER',
} as const;

export type MembershipRole =
  (typeof MembershipRoles)[keyof typeof MembershipRoles];

export const MEMBERSHIP_ROLE_VALUES: readonly MembershipRole[] = Object.values(
  MembershipRoles,
) as MembershipRole[];

export function isMembershipRole(value: string): value is MembershipRole {
  return (MEMBERSHIP_ROLE_VALUES as readonly string[]).includes(value);
}

/** Display labels only — not used for authorization. */
export const MEMBERSHIP_ROLE_UI_LABELS: Record<MembershipRole, string> = {
  [MembershipRoles.GAMEMASTER]: 'Game Master',
  [MembershipRoles.WRITER]: 'Writer',
  [MembershipRoles.PARTICIPANT]: 'Player',
  [MembershipRoles.OBSERVER]: 'Observer',
};

export function membershipRoleUiLabel(role: MembershipRole | null | undefined): string {
  if (!role) return 'Guest';
  return MEMBERSHIP_ROLE_UI_LABELS[role] ?? role;
}

/** Narrative projection: elevated wiki/map/chronology management tier. */
export function isElevatedMembershipRole(
  role: MembershipRole | string | null | undefined,
): boolean {
  return role === MembershipRoles.GAMEMASTER || role === MembershipRoles.WRITER;
}
