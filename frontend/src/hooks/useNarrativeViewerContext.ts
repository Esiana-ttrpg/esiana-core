import { useMemo } from 'react';
import {
  buildNarrativeViewerContext,
  type NarrativeViewerContext,
} from '@shared/narrativeProjection';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';

export type UseNarrativeViewerContextInput = {
  campaignHandle: string;
  role: string | null | undefined;
  epochMinute?: bigint;
  allowPlayerChronologyManagement?: boolean;
};

export function useNarrativeViewerContext(
  input: UseNarrativeViewerContextInput,
): NarrativeViewerContext {
  const dateParts = useCampaignChronologyNow(input.campaignHandle);
  const role = input.role ?? null;
  const epochMinute = input.epochMinute ?? 0n;
  const allowPlayerChronologyManagement =
    input.allowPlayerChronologyManagement ?? false;

  return useMemo(
    () =>
      buildNarrativeViewerContext({
        role,
        campaignNow: { epochMinute, dateParts },
        allowPlayerChronologyManagement,
      }),
    [role, epochMinute, dateParts, allowPlayerChronologyManagement],
  );
}

export function useIsElevatedPerspective(ctx: NarrativeViewerContext): boolean {
  return ctx.perspective === 'elevated';
}
