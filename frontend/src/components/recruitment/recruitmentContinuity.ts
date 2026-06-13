import { formatRecruitmentContinuityLine } from '@shared/recruitmentContinuity';
import type { PublicDirectoryCampaign } from '@/types/recruitment';

export function getContinuityLine(campaign: PublicDirectoryCampaign): string | null {
  const r = campaign.recruitment;
  return formatRecruitmentContinuityLine({
    currentSession: r.currentSession,
    createdAt: campaign.createdAt,
    sessionDuration: r.sessionDuration,
    estimatedLength: r.estimatedLength,
  });
}
