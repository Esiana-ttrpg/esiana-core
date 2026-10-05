import { ensureChronologyEras } from './chronologyEraService.js';
import type { CampaignMomentum, Prisma } from './prismaClient.js';
import {
  CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
  createDefaultCampaignMomentumState,
  getCurrentCampaignEra,
  parseCampaignMomentumState,
  serializeCampaignMomentumState,
  type CampaignMomentumState,
} from '../../../shared/factionMomentumMetadata.js';

export type CampaignMomentumPayload = {
  semanticsVersion: string;
  state: CampaignMomentumState;
  updatedAt: string;
};

export async function ensureCampaignMomentum(
  campaignId: string,
  tx?: Prisma.TransactionClient,
): Promise<CampaignMomentum> {
  const db = tx ?? (await import('./prisma.js')).prisma;
  await ensureChronologyEras(campaignId, tx);
  const existing = await db.campaignMomentum.findUnique({
    where: { campaignId },
  });
  if (existing?.erasMigrated) {
    // Read canonical track metadata, including changes to the master calendar,
    // rather than relying on a previously persisted compatibility projection.
    const eras = await db.campaignEra.findMany({ where: { campaignId }, include: { calendar: true }, orderBy: [{ calendarId: 'asc' }, { sortOrder: 'asc' }] });
    return { ...existing, state: {
      ...(existing.state as Record<string, Prisma.JsonValue>), chronologyOwned: true,
      eras: eras.map(era => ({
        id: era.id, name: era.name, calendarId: era.calendarId, calendarName: era.calendar.name,
        isMasterTime: era.calendar.isMasterTime, sortOrder: era.sortOrder,
        isCurrent: era.isCurrent, visibility: era.visibility,
        epochStartMinute: era.epochStartMinute?.toString() ?? null,
        epochEndMinute: era.epochEndMinute?.toString() ?? null, narrativeNote: null,
      })),
    } };
  }
  if (existing) return existing;

  const defaultState = createDefaultCampaignMomentumState();
  return db.campaignMomentum.create({
    data: {
      campaignId,
      state: serializeCampaignMomentumState(defaultState) as Prisma.InputJsonValue,
      semanticsVersion: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
    },
  });
}

export function toCampaignMomentumPayload(row: CampaignMomentum): CampaignMomentumPayload {
  return {
    semanticsVersion: row.semanticsVersion,
    state: parseCampaignMomentumState(row.state),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCampaignMomentumPayload(
  campaignId: string,
): Promise<CampaignMomentumPayload> {
  const row = await ensureCampaignMomentum(campaignId);
  return toCampaignMomentumPayload(row);
}

export async function updateCampaignMomentumState(input: {
  campaignId: string;
  worldPressurePaused?: boolean;
  updatedByUserId?: string | null;
}): Promise<CampaignMomentumPayload> {
  await ensureCampaignMomentum(input.campaignId);
  const { prisma } = await import('./prisma.js');
  return prisma.$transaction(async db => {
    // Serialize settings changes with era mutations before reading the projection.
    const row = await db.campaignMomentum.update({
      where: { campaignId: input.campaignId }, data: { updatedAt: new Date() },
    });
    const current = parseCampaignMomentumState(row.state);
    const nextState: CampaignMomentumState = {
      ...current,
      worldPressurePaused: input.worldPressurePaused ?? current.worldPressurePaused,
    };
    const updated = await db.campaignMomentum.update({
      where: { campaignId: input.campaignId },
      data: {
        state: serializeCampaignMomentumState(nextState) as Prisma.InputJsonValue,
        semanticsVersion: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
        updatedByUserId: input.updatedByUserId ?? undefined,
      },
    });
    return toCampaignMomentumPayload(updated);
  });
}

export { getCurrentCampaignEra };
