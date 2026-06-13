import { UserRole } from '@prisma/client';
import type { IdentityProvider } from '@prisma/client';
import { prisma } from '../prisma.js';
import { getClaimByPath, normalizeGroupsClaimValue } from './oidcClaims.js';

const ALLOWED_MAPPED_ROLES = new Set<string>([
  UserRole.SYSTEM_ADMIN,
  UserRole.USER,
]);

export function parseGroupRoleMappings(
  raw: unknown,
): Record<string, UserRole> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, UserRole> = {};
  for (const [groupKey, roleValue] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    const key = groupKey.trim();
    if (!key || typeof roleValue !== 'string') continue;
    if (!ALLOWED_MAPPED_ROLES.has(roleValue)) continue;
    out[key] = roleValue as UserRole;
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

  let targetRole: UserRole | null = null;
  for (const group of groups) {
    const mapped = mappings[group];
    if (!mapped) continue;
    if (mapped === UserRole.SYSTEM_ADMIN) {
      targetRole = UserRole.SYSTEM_ADMIN;
      break;
    }
    if (!targetRole) targetRole = mapped;
  }

  // Promote-only: never demote on login.
  if (
    targetRole === UserRole.SYSTEM_ADMIN &&
    user.role !== UserRole.SYSTEM_ADMIN
  ) {
    await prisma.user.update({
      where: { id: params.userId },
      data: { role: UserRole.SYSTEM_ADMIN },
    });
  }

  return groups;
}
