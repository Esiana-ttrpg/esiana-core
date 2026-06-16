import type { IdentityProvider } from '@prisma/client';
import { UserRoles, type UserRoleLiteral } from '../../types/domain.js';
import { prisma } from '../prisma.js';
import { getClaimByPath, normalizeGroupsClaimValue } from './oidcClaims.js';

const ALLOWED_MAPPED_ROLES = new Set<string>([
  UserRoles.SYSTEM_ADMIN,
  UserRoles.USER,
]);

export function parseGroupRoleMappings(
  raw: unknown,
): Record<string, UserRoleLiteral> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, UserRoleLiteral> = {};
  for (const [groupKey, roleValue] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    const key = groupKey.trim();
    if (!key || typeof roleValue !== 'string') continue;
    if (!ALLOWED_MAPPED_ROLES.has(roleValue)) continue;
    out[key] = roleValue as UserRoleLiteral;
  }
  return out;
}

export function extractGroupsFromClaims(
  claims: Record<string, unknown>,
  groupsClaim: string | null | undefined,
): string[] {
  if (!groupsClaim?.trim()) return [];
  const raw = getClaimByPath(claims, groupsClaim.trim());
  return normalizeGroupsClaimValue(raw);
}

export async function syncGroupsOnLogin(params: {
  userId: string;
  accountId: string;
  provider: IdentityProvider;
  claims: Record<string, unknown>;
}): Promise<string[]> {
  const groups = extractGroupsFromClaims(
    params.claims,
    params.provider.groupsClaim,
  );

  if (params.provider.groupsClaim?.trim()) {
    await prisma.account.update({
      where: { id: params.accountId },
      data: {
        idpGroups: groups,
        groupsSyncedAt: new Date(),
      },
    });
  }

  const mappings = parseGroupRoleMappings(params.provider.groupRoleMappings);
  if (Object.keys(mappings).length === 0 || groups.length === 0) {
    return groups;
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { role: true },
  });
  if (!user) return groups;

  let targetRole: UserRoleLiteral | null = null;
  for (const group of groups) {
    const mapped = mappings[group];
    if (!mapped) continue;
    if (mapped === UserRoles.SYSTEM_ADMIN) {
      targetRole = UserRoles.SYSTEM_ADMIN;
      break;
    }
    if (!targetRole) targetRole = mapped;
  }

  // Promote-only: never demote on login.
  if (
    targetRole === UserRoles.SYSTEM_ADMIN &&
    user.role !== UserRoles.SYSTEM_ADMIN
  ) {
    await prisma.user.update({
      where: { id: params.userId },
      data: { role: UserRoles.SYSTEM_ADMIN },
    });
  }

  return groups;
}
