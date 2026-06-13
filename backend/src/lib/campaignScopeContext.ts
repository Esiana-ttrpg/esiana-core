import {
  buildActorFromAclContext,
  isCampaignOwner,
  normalizeCampaignMemberRole,
} from './acl.js';
import { normalizeDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';
import { resolveActorCapabilities } from '../../../shared/campaignPolicy/policy.js';
import type { CampaignContext } from '../types/api.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { prisma } from './prisma.js';

const overrideCache = new Map<
  string,
  { loadedAt: number; rows: CampaignContext['roleCapabilityOverrides'] }
>();
const OVERRIDE_CACHE_TTL_MS = 30_000;

async function loadRoleCapabilityOverrides(
  campaignId: string,
): Promise<CampaignContext['roleCapabilityOverrides']> {
  const cached = overrideCache.get(campaignId);
  if (cached && Date.now() - cached.loadedAt < OVERRIDE_CACHE_TTL_MS) {
    return cached.rows;
  }
  const rows = await prisma.campaignRoleCapabilityOverride.findMany({
    where: { campaignId },
    select: { role: true, capability: true, effect: true },
  });
  overrideCache.set(campaignId, { loadedAt: Date.now(), rows });
  return rows;
}

export function invalidateCampaignCapabilityOverrideCache(
  campaignId: string,
): void {
  overrideCache.delete(campaignId);
}

export async function buildCampaignContext(input: {
  campaignId: string;
  campaignHandle: string;
  campaignOwnerUserId: string;
  discoverability: string;
  allowPlayerChronologyManagement: boolean;
  userId: string | null;
  membershipRole: string | null;
  chronologyContributor?: boolean;
  partyId?: string | null;
  roleCapabilityOverrides?: CampaignContext['roleCapabilityOverrides'];
}): Promise<CampaignContext> {
  const role: CampaignMemberRole | null = input.membershipRole
    ? normalizeCampaignMemberRole(input.membershipRole)
    : null;

  const discoverability = normalizeDiscoverability(input.discoverability);

  const roleCapabilityOverrides =
    input.roleCapabilityOverrides ??
    (await loadRoleCapabilityOverrides(input.campaignId));

  const actor = buildActorFromAclContext({
    userId: input.userId,
    membershipRole: role,
    campaignOwnerUserId: input.campaignOwnerUserId,
    discoverability,
    allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
    chronologyContributor: input.chronologyContributor ?? false,
    partyId: input.partyId ?? null,
    roleCapabilityOverrides,
  });

  return {
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    campaignOwnerUserId: input.campaignOwnerUserId,
    discoverability,
    allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
    role,
    chronologyContributor: input.chronologyContributor ?? false,
    partyId: input.partyId ?? null,
    isMember: role !== null,
    isCampaignOwner: isCampaignOwner(input.userId, input.campaignOwnerUserId),
    actor,
    capabilities: resolveActorCapabilities(actor),
    roleCapabilityOverrides,
  };
}

/** Synchronous builder when overrides and party are already loaded. */
export function buildCampaignContextSync(
  input: Parameters<typeof buildCampaignContext>[0] & {
    roleCapabilityOverrides: CampaignContext['roleCapabilityOverrides'];
  },
): CampaignContext {
  const role: CampaignMemberRole | null = input.membershipRole
    ? normalizeCampaignMemberRole(input.membershipRole)
    : null;

  const discoverability = normalizeDiscoverability(input.discoverability);

  const actor = buildActorFromAclContext({
    userId: input.userId,
    membershipRole: role,
    campaignOwnerUserId: input.campaignOwnerUserId,
    discoverability,
    allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
    chronologyContributor: input.chronologyContributor ?? false,
    partyId: input.partyId ?? null,
    roleCapabilityOverrides: input.roleCapabilityOverrides,
  });

  return {
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    campaignOwnerUserId: input.campaignOwnerUserId,
    discoverability,
    allowPlayerChronologyManagement: input.allowPlayerChronologyManagement,
    role,
    chronologyContributor: input.chronologyContributor ?? false,
    partyId: input.partyId ?? null,
    isMember: role !== null,
    isCampaignOwner: isCampaignOwner(input.userId, input.campaignOwnerUserId),
    actor,
    capabilities: resolveActorCapabilities(actor),
    roleCapabilityOverrides: input.roleCapabilityOverrides,
  };
}
