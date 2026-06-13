import bcrypt from 'bcryptjs';
import { canCreateSeededDemoUsers } from '../config/env.js';
import { prisma } from './prisma.js';
import { CampaignMemberRoles } from '../types/domain.js';

export const SEEDED_DEMO_PASSWORD = 'esiana-demo-seed';
const SEED_EMAIL_DOMAIN = '@seed.esiana.local';

export interface SeedProvenance {
  source: string;
  campaignId: string;
  presetId: string;
}

export interface PreparedDemoUsers {
  fakeDmUserId?: string;
  fakePlayerUserIds: string[];
}

export function isSeededDemoEmail(email: string): boolean {
  return email.toLowerCase().endsWith(SEED_EMAIL_DOMAIN);
}

export function isSeededDemoUser(user: {
  email: string;
  appearanceProfile?: unknown;
}): boolean {
  if (isSeededDemoEmail(user.email)) return true;
  const profile = user.appearanceProfile;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;
  const provenance = (profile as Record<string, unknown>).seedProvenance;
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) return false;
  return (provenance as Record<string, unknown>).isSeededDemoAccount === true;
}

async function markSeededDemoUser(userId: string, provenance: SeedProvenance): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appearanceProfile: true },
  });
  const existing =
    user?.appearanceProfile &&
    typeof user.appearanceProfile === 'object' &&
    !Array.isArray(user.appearanceProfile)
      ? (user.appearanceProfile as Record<string, unknown>)
      : {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      appearanceProfile: {
        ...existing,
        seedProvenance: {
          isSeededDemoAccount: true,
          source: provenance.source,
          campaignId: provenance.campaignId,
          presetId: provenance.presetId,
          createdAt: new Date().toISOString(),
        },
      },
    },
  });
}

async function upsertDemoUser(
  email: string,
  displayName: string,
  passwordHash: string,
  provenance: SeedProvenance,
): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    await markSeededDemoUser(existing.id, provenance);
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
    },
    select: { id: true },
  });
  await markSeededDemoUser(user.id, provenance);
  return user;
}

/**
 * Create demo User rows before wiki seeding so session/journal ops can rotate authorship.
 */
export async function prepareDemoPlayerUsers(
  campaignHandle: string,
  options: { includeFakeDm: boolean; presetId: string; campaignId: string },
): Promise<PreparedDemoUsers> {
  if (!canCreateSeededDemoUsers()) {
    return { fakePlayerUserIds: [] };
  }

  const passwordHash = await bcrypt.hash(SEEDED_DEMO_PASSWORD, 12);
  const provenance: SeedProvenance = {
    source: 'campaign-generator',
    campaignId: options.campaignId,
    presetId: options.presetId,
  };

  const result: PreparedDemoUsers = { fakePlayerUserIds: [] };

  if (options.includeFakeDm) {
    const dm = await upsertDemoUser(
      `${campaignHandle}-dm${SEED_EMAIL_DOMAIN}`,
      `${campaignHandle} Demo DM`,
      passwordHash,
      provenance,
    );
    result.fakeDmUserId = dm.id;
  }

  for (let index = 1; index <= 3; index += 1) {
    const player = await upsertDemoUser(
      `${campaignHandle}-player-${index}${SEED_EMAIL_DOMAIN}`,
      `${campaignHandle} Demo Player ${index}`,
      passwordHash,
      provenance,
    );
    result.fakePlayerUserIds.push(player.id);
  }

  return result;
}

function resolvePageId(idMap: Map<string, string>, key: string): string | null {
  return idMap.get(key) ?? null;
}

/**
 * Wire CampaignMember rows and identity pages after wiki seed completes.
 */
export async function wireDemoPartyAfterSeed(options: {
  campaignId: string;
  creatorUserId: string;
  idMap: Map<string, string>;
  fakeDmUserId?: string;
  fakePlayerUserIds: string[];
  joinAsPlayer: boolean;
}): Promise<void> {
  if (!canCreateSeededDemoUsers()) return;

  const { campaignId, creatorUserId, idMap, fakeDmUserId, fakePlayerUserIds, joinAsPlayer } =
    options;

  const pcKeys = ['pc:1', 'pc:2', 'pc:3'] as const;

  if (joinAsPlayer && fakeDmUserId) {
    await prisma.campaignMember.upsert({
      where: {
        userId_campaignId: { userId: fakeDmUserId, campaignId },
      },
      create: {
        userId: fakeDmUserId,
        campaignId,
        role: CampaignMemberRoles.GAMEMASTER,
      },
      update: {
        role: CampaignMemberRoles.GAMEMASTER,
      },
    });
  }

  for (let index = 0; index < fakePlayerUserIds.length; index += 1) {
    const userId = fakePlayerUserIds[index];
    const pcKey = pcKeys[index];
    if (!userId || !pcKey) continue;
    const identityPageId = resolvePageId(idMap, pcKey);
    await prisma.campaignMember.upsert({
      where: {
        userId_campaignId: { userId, campaignId },
      },
      create: {
        userId,
        campaignId,
        role: CampaignMemberRoles.PARTICIPANT,
        ...(identityPageId ? { identityPageId } : {}),
      },
      update: {
        role: CampaignMemberRoles.PARTICIPANT,
        ...(identityPageId ? { identityPageId } : {}),
      },
    });
  }

  if (joinAsPlayer) {
    await promoteCreatorToPlayer(campaignId, creatorUserId, idMap);
  }
}

export async function promoteCreatorToPlayer(
  campaignId: string,
  creatorUserId: string,
  idMap: Map<string, string>,
): Promise<void> {
  if (!canCreateSeededDemoUsers()) return;

  const identityPageId = resolvePageId(idMap, 'pc:creator');
  await prisma.campaignMember.update({
    where: {
      userId_campaignId: { userId: creatorUserId, campaignId },
    },
    data: {
      role: CampaignMemberRoles.PARTICIPANT,
      ...(identityPageId ? { identityPageId } : {}),
    },
  });
}