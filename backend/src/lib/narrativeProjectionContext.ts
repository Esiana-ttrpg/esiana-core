import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  buildNarrativeViewerContext,
  type CampaignChronologyNow,
  type NarrativeViewerCapabilities,
  type NarrativeViewerContext,
} from '../../../shared/narrativeProjection.js';
import {
  can as policyCan,
  canManageChronology,
  hasElevatedNarrativeView,
  type CampaignActor,
} from '../../../shared/campaignPolicy/policy.js';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { prisma } from './prisma.js';

export type BuildContextFromRequestOptions = {
  currentEpochMinute?: bigint;
  dateParts?: CampaignChronologyNow['dateParts'];
  allowPlayerChronologyManagement?: boolean;
  actor?: CampaignActor;
};

export function narrativeCapabilitiesFromActor(
  actor: CampaignActor,
): Partial<NarrativeViewerCapabilities> {
  const elevated = hasElevatedNarrativeView(actor);
  return {
    canManageChronology: canManageChronology(actor),
    canRevealContent: policyCan(actor, CampaignCapabilities.DISCOVERY_REVEAL),
    canUseGhostMode: elevated,
    isElevatedWiki: elevated,
    isElevatedMap: elevated,
  };
}

export async function buildNarrativeViewerContextFromCampaign(
  campaignId: string,
  role: CampaignMemberRole | null,
  options: BuildContextFromRequestOptions = {},
): Promise<NarrativeViewerContext> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      currentEpochMinute: true,
      allowPlayerChronologyManagement: true,
    },
  });

  const epochMinute =
    options.currentEpochMinute ?? campaign?.currentEpochMinute ?? 0n;
  const dateParts =
    options.dateParts ?? (await resolveCampaignChronologyNow(campaignId));

  return buildNarrativeViewerContext({
    role,
    campaignNow: { epochMinute, dateParts },
    allowPlayerChronologyManagement:
      options.allowPlayerChronologyManagement ??
      campaign?.allowPlayerChronologyManagement ??
      false,
    capabilityOverrides: options.actor
      ? narrativeCapabilitiesFromActor(options.actor)
      : undefined,
  });
}

export async function buildNarrativeViewerContextFromRequest(
  req: CampaignScopedRequest,
  options: Omit<BuildContextFromRequestOptions, 'allowPlayerChronologyManagement'> = {},
): Promise<NarrativeViewerContext | null> {
  const scope = req.campaign;
  if (!scope) return null;

  const role = (scope.role as CampaignMemberRole | null) ?? null;
  return buildNarrativeViewerContextFromCampaign(scope.campaignId, role, {
    ...options,
    allowPlayerChronologyManagement: undefined,
    actor: options.actor ?? scope.actor,
  });
}
