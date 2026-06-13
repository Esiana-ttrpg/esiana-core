/**
 * Character-level party cast participation (wiki metadata).
 * Separate from CampaignMember.identityPageId (player → character link).
 */

export const PartyParticipationRoles = {
  PLAYER_CHARACTER: 'PLAYER_CHARACTER',
  COMPANION: 'COMPANION',
  NPC_ALLY: 'NPC_ALLY',
  GUEST: 'GUEST',
} as const;

export type PartyParticipationRole =
  (typeof PartyParticipationRoles)[keyof typeof PartyParticipationRoles];

export const ALL_PARTY_PARTICIPATION_ROLES: readonly PartyParticipationRole[] =
  Object.values(PartyParticipationRoles);

export interface PartyParticipation {
  active: boolean;
  role: PartyParticipationRole;
}

export const PARTY_PARTICIPATION_ROLE_LABELS: Record<PartyParticipationRole, string> = {
  PLAYER_CHARACTER: 'Player Character',
  COMPANION: 'Companion',
  NPC_ALLY: 'NPC Ally',
  GUEST: 'Guest',
};

/** Sort rank for roster ordering (lower = earlier). */
export const PARTY_PARTICIPATION_ROLE_RANK: Record<PartyParticipationRole, number> = {
  PLAYER_CHARACTER: 0,
  COMPANION: 1,
  NPC_ALLY: 2,
  GUEST: 3,
};

export const DEFAULT_PARTY_PARTICIPATION: PartyParticipation = {
  active: false,
  role: PartyParticipationRoles.PLAYER_CHARACTER,
};

function isPartyParticipationRole(raw: unknown): raw is PartyParticipationRole {
  return (
    typeof raw === 'string' &&
    (ALL_PARTY_PARTICIPATION_ROLES as readonly string[]).includes(raw)
  );
}

export function normalizePartyParticipationRole(
  raw: unknown,
): PartyParticipationRole {
  if (isPartyParticipationRole(raw)) return raw;
  return PartyParticipationRoles.PLAYER_CHARACTER;
}

export function parsePartyParticipation(metadata: unknown): PartyParticipation {
  if (!metadata || typeof metadata !== 'object') {
    return { ...DEFAULT_PARTY_PARTICIPATION };
  }
  const raw = (metadata as Record<string, unknown>).partyParticipation;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PARTY_PARTICIPATION };
  }
  const obj = raw as Record<string, unknown>;
  return {
    active: obj.active === true,
    role: normalizePartyParticipationRole(obj.role),
  };
}

export function normalizePartyParticipationPatch(
  raw: unknown,
): PartyParticipation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PARTY_PARTICIPATION };
  }
  const obj = raw as Record<string, unknown>;
  return {
    active: obj.active === true,
    role: normalizePartyParticipationRole(obj.role),
  };
}

export function formatPartyParticipationLabel(
  participation: PartyParticipation,
): string | null {
  if (!participation.active) return null;
  return PARTY_PARTICIPATION_ROLE_LABELS[participation.role];
}

/** Whether a character page is on the active party cast. */
export function isActivePartyCharacter(metadata: unknown): boolean {
  return parsePartyParticipation(metadata).active;
}

/** Compact read-mode chip label, e.g. "Party · Companion". */
export function formatPartyParticipationChip(
  participation: PartyParticipation,
): string | null {
  if (!participation.active) return null;
  const roleLabel = PARTY_PARTICIPATION_ROLE_LABELS[participation.role];
  return `Party · ${roleLabel}`;
}
