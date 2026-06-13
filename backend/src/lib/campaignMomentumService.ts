import { randomUUID } from 'node:crypto';
import type { CampaignMomentum, Prisma } from '@prisma/client';
import {
  CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
  createDefaultCampaignMomentumState,
  getCurrentCampaignEra,
  normalizeCampaignEra,
  parseCampaignMomentumState,
  serializeCampaignMomentumState,
  type CampaignEra,
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
  const existing = await db.campaignMomentum.findUnique({
    where: { campaignId },
  });
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

function normalizeErasForSave(eras: CampaignEra[]): CampaignEra[] {
  const parsed = eras
    .map((era, index) =>
      normalizeCampaignEra(
        {
          id: era.id,
          name: era.name,
          sortOrder: era.sortOrder ?? index,
          isCurrent: era.isCurrent,
          epochStartMinute: era.epochStartMinute,
          epochEndMinute: era.epochEndMinute,
          narrativeNote: era.narrativeNote,
        },
        index,
      ),
    )
    .filter((era): era is CampaignEra => era !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (parsed.length === 0) {
    return createDefaultCampaignMomentumState().eras;
  }

  const currentIndices = parsed
    .map((era, index) => (era.isCurrent ? index : -1))
    .filter((index) => index >= 0);

  const currentIndex = currentIndices.length === 1 ? currentIndices[0]! : 0;
  return parsed.map((era, index) => ({
    ...era,
    isCurrent: index === currentIndex,
  }));
}

export async function getCampaignMomentumPayload(
  campaignId: string,
): Promise<CampaignMomentumPayload> {
  const row = await ensureCampaignMomentum(campaignId);
  return toCampaignMomentumPayload(row);
}

export async function updateCampaignMomentumState(input: {
  campaignId: string;
  eras?: CampaignEra[];
  worldPressurePaused?: boolean;
  updatedByUserId?: string | null;
}): Promise<CampaignMomentumPayload> {
  const row = await ensureCampaignMomentum(input.campaignId);
  const current = parseCampaignMomentumState(row.state);

  const nextState: CampaignMomentumState = {
    version: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
    eras: input.eras != null ? normalizeErasForSave(input.eras) : current.eras,
    worldPressurePaused:
      input.worldPressurePaused !== undefined
        ? input.worldPressurePaused
        : current.worldPressurePaused,
  };

  const updated = await (
    await import('./prisma.js')
  ).prisma.campaignMomentum.update({
    where: { campaignId: input.campaignId },
    data: {
      state: serializeCampaignMomentumState(nextState) as Prisma.InputJsonValue,
      semanticsVersion: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
      updatedByUserId: input.updatedByUserId ?? undefined,
    },
  });

  return toCampaignMomentumPayload(updated);
}

export function createCampaignEraId(): string {
  return `era-${randomUUID().slice(0, 8)}`;
}

export { getCurrentCampaignEra };
