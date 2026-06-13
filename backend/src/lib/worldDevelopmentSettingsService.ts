import type { Prisma } from '@prisma/client';
import {
  createDefaultWorldDevelopmentSettings,
  parseWorldDevelopmentSettings,
  type WorldDevelopmentSettings,
} from '../../../shared/worldDevelopmentMetadata.js';
import {
  CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
  parseCampaignMomentumState,
  serializeCampaignMomentumState,
  type CampaignMomentumState,
} from '../../../shared/factionMomentumMetadata.js';
import type { WorldDevelopmentSettingsPayload } from '../../../shared/worldDevelopmentPresentation.js';
import {
  ensureCampaignMomentum,
} from './campaignMomentumService.js';
import { prisma } from './prisma.js';
import { buildWorldDevelopmentSourceSignals } from './worldDevelopmentPresentationHelpers.js';

export async function countWorldEventSuggestionHistory(campaignId: string): Promise<number> {
  return prisma.campaignWorldEventSuggestion.count({ where: { campaignId } });
}

/** Resolve settings with legacy migration for campaigns that used world-event prompts. */
export async function resolveWorldDevelopmentSettings(
  campaignId: string,
  tx?: Prisma.TransactionClient,
): Promise<WorldDevelopmentSettings> {
  const db = tx ?? prisma;
  const row = await ensureCampaignMomentum(campaignId, tx);
  const state = parseCampaignMomentumState(row.state);

  if (state.worldDevelopment) {
    return {
      ...state.worldDevelopment,
      worldPressurePaused:
        state.worldDevelopment.worldPressurePaused ?? state.worldPressurePaused === true,
    };
  }

  const historyCount = await db.campaignWorldEventSuggestion.count({ where: { campaignId } });
  const defaults = createDefaultWorldDevelopmentSettings();
  if (historyCount > 0 && state.worldPressurePaused !== true) {
    return {
      ...defaults,
      mode: 'manual',
      worldPressurePaused: false,
    };
  }

  return {
    ...defaults,
    worldPressurePaused: state.worldPressurePaused === true,
  };
}

export async function getWorldDevelopmentSettingsPayload(
  campaignId: string,
): Promise<WorldDevelopmentSettingsPayload> {
  const settings = await resolveWorldDevelopmentSettings(campaignId);
  const sourceSignals = await buildWorldDevelopmentSourceSignals(campaignId);
  return {
    settings,
    sourceSignals,
  };
}

export async function saveWorldDevelopmentSettings(
  campaignId: string,
  userId: string,
  input: Partial<WorldDevelopmentSettings>,
): Promise<WorldDevelopmentSettings> {
  const row = await ensureCampaignMomentum(campaignId);
  const state = parseCampaignMomentumState(row.state);
  const current = state.worldDevelopment ?? (await resolveWorldDevelopmentSettings(campaignId));

  const merged = parseWorldDevelopmentSettings({
    ...current,
    ...input,
    expiration: {
      ...current.expiration,
      ...(input.expiration ?? {}),
    },
    typeLifecycles: {
      ...current.typeLifecycles,
      ...(input.typeLifecycles ?? {}),
    },
  });

  const nextState: CampaignMomentumState = {
    ...state,
    worldDevelopment: merged,
    worldPressurePaused: merged.worldPressurePaused === true,
  };

  await prisma.campaignMomentum.update({
    where: { campaignId },
    data: {
      state: serializeCampaignMomentumState(nextState) as Prisma.InputJsonValue,
      semanticsVersion: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
      updatedByUserId: userId,
    },
  });
  return merged;
}

export function attachWorldDevelopmentToMomentumState(
  state: CampaignMomentumState,
  settings: WorldDevelopmentSettings,
): CampaignMomentumState {
  return {
    ...state,
    worldDevelopment: settings,
    worldPressurePaused: settings.worldPressurePaused === true,
  };
}

export function serializeMomentumWithWorldDevelopment(
  state: CampaignMomentumState,
): Record<string, unknown> {
  return serializeCampaignMomentumState(state);
}
