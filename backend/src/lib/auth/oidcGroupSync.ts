import type { IdentityProvider } from '@prisma/client';
import { UserRoles, type UserRoleLiteral } from '../../types/domain.js';
import { getOidcEnvConfig } from '../../config/oidcEnv.js';
import { prisma } from '../prisma.js';
import { getClaimByPath, normalizeGroupsClaimValue } from './oidcClaims.js';
import { bumpUserSessionVersion } from './sessionVersion.js';

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

export function mergeEnvAdminGroupMappings(
  mappings: Record<string, UserRoleLiteral>,
): Record<string, UserRoleLiteral> {
  const cfg = getOidcEnvConfig();
  if (!cfg.adminGroup?.trim()) return mappings;
  return {
    ...mappings,
    [cfg.adminGroup.trim()]: UserRoles.SYSTEM_ADMIN,
  };
}

export function resolveGroupsClaimPath(
  provider: IdentityProvider,
): string | null {
  const cfg = getOidcEnvConfig();
  if (provider.groupsClaim?.trim()) return provider.groupsClaim.trim();
  if (cfg.userGroup || cfg.adminGroup) return 'groups';
  return null;
}

/** Authoritative SYSTEM_ADMIN when admin mappings exist; promote-only otherwise. */
export function resolveRoleFromOidcGroupMappings(params: {
  currentRole: string;
  groups: string[];
  mappings: Record<string, UserRoleLiteral>;
}): UserRoleLiteral | null {
  const merged = mergeEnvAdminGroupMappings(params.mappings);
  const hasAdminMapping = Object.values(merged).includes(
    UserRoles.SYSTEM_ADMIN,
  );

  if (hasAdminMapping) {
    const inAdminGroup = params.groups.some(
      (g) => merged[g] === UserRoles.SYSTEM_ADMIN,
    );
    return inAdminGroup ? UserRoles.SYSTEM_ADMIN : UserRoles.USER;
  }

  let targetRole: UserRoleLiteral | null = null;
  for (const group of params.groups) {
    const mapped = merged[group];
    if (!mapped) continue;
    if (mapped === UserRoles.SYSTEM_ADMIN) {
      return UserRoles.SYSTEM_ADMIN;
    }
    if (!targetRole) targetRole = mapped;
  }

  if (targetRole && targetRole !== params.currentRole) {
    return targetRole;
  }

  return null;
}

export async function syncGroupsOnLogin(params: {
  userId: string;
  accountId: string;
  provider: IdentityProvider;
  claims: Record<string, unknown>;
}): Promise<{ groups: string[]; roleChanged: boolean }> {
  const groupsClaimPath = resolveGroupsClaimPath(params.provider);
  const groups = extractGroupsFromClaims(params.claims, groupsClaimPath);

  if (groupsClaimPath) {
    await prisma.account.update({
      where: { id: params.accountId },
      data: {
        idpGroups: groups,
        groupsSyncedAt: new Date(),
      },
    });
  }

  const mappings = parseGroupRoleMappings(params.provider.groupRoleMappings);
  const merged = mergeEnvAdminGroupMappings(mappings);
  if (Object.keys(merged).length === 0) {
    return { groups, roleChanged: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { role: true },
  });
  if (!user) return { groups, roleChanged: false };

  const targetRole = resolveRoleFromOidcGroupMappings({
    currentRole: user.role,
    groups,
    mappings,
  });

  if (targetRole === null || targetRole === user.role) {
    return { groups, roleChanged: false };
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: { role: targetRole },
  });
  await bumpUserSessionVersion(params.userId);
  return { groups, roleChanged: true };
}
