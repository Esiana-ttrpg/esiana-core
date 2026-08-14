import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  buildNarrativeViewerContext,
  type CampaignChronologyNow,
  type NarrativeViewerContext,
} from '../../../shared/narrativeProjection.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { prisma } from './prisma.js';

export type BuildContextFromRequestOptions = {
  currentEpochMinute?: bigint;
  dateParts?: CampaignChronologyNow['dateParts'];
  allowPlayerChronologyManagement?: boolean;
};

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
  });
}
