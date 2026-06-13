import type { DowntimePressurePresentation } from '../../../shared/downtimeHub.js';
import { buildDowntimePressurePresentation } from '../../../shared/downtimeContinuityIntegration.js';
import { listDowntimeHavens } from './downtimeHavenService.js';
import { listDowntimeProjectDetails } from './downtimeProjectService.js';
import { buildGlobalContinuityPayload } from './wikiContinuityService.js';
import type { CampaignMemberRole } from '../types/domain.js';

export async function loadDowntimePressurePresentation(input: {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  currentEpochMinute: bigint;
}): Promise<DowntimePressurePresentation> {
  const [globalContinuity, havens, projectRows] = await Promise.all([
    buildGlobalContinuityPayload({
      campaignId: input.campaignId,
      role: input.role,
    }),
    listDowntimeHavens(input.campaignId, input.campaignHandle, input.role),
    listDowntimeProjectDetails(input.campaignId, input.campaignHandle, input.role, {
      includeTerminal: false,
    }),
  ]);

  return buildDowntimePressurePresentation({
    continuityIssues: globalContinuity.issues,
    havens,
    projects: projectRows.map((row) => row.project),
  });
}
