import { useMemo } from 'react';
import {
  hasElevatedNarrativeView,
  type CampaignActor,
} from '@shared/campaignPolicy/policy';
import type { CampaignCapability } from '@shared/campaignPolicy/capabilities';
import type { NarrativeViewerContext } from '@shared/narrativeProjection';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { useNarrativeViewerContext } from '@/hooks/useNarrativeViewerContext';

export type CampaignActorHookResult = {
  actor: CampaignActor | null;
  viewerContext: NarrativeViewerContext;
  previewAsPlayer: boolean;
  isElevated: () => boolean;
  isElevatedPerspective: () => boolean;
  can: (cap: CampaignCapability) => boolean;
};

const EMPTY_CAN = (_cap: CampaignCapability) => false;

/** Canonical campaign actor + narrative viewer context. Never reconstructs actor from partial inputs. */
export function useCampaignActor(options?: {
  previewAsPlayer?: boolean;
}): CampaignActorHookResult {
  const wiki = useOptionalWiki();
  const actor = wiki?.actor ?? null;
  const hasElevatedView = wiki?.hasElevatedView ?? false;
  const can = wiki?.can ?? EMPTY_CAN;
  const campaign = wiki?.campaign;
  const campaignHandle = wiki?.campaignHandle ?? '';

  const previewAsPlayer =
    Boolean(options?.previewAsPlayer) && hasElevatedView;

  const viewerContext = useNarrativeViewerContext({
    campaignHandle,
    role: campaign?.role,
    allowPlayerChronologyManagement: campaign?.allowPlayerChronologyManagement,
  });

  const effectiveViewerContext = useMemo(
    () =>
      previewAsPlayer
        ? { ...viewerContext, perspective: 'party' as const }
        : viewerContext,
    [previewAsPlayer, viewerContext],
  );

  return useMemo(
    () => ({
      actor,
      viewerContext: effectiveViewerContext,
      previewAsPlayer,
      isElevated: () => (actor ? hasElevatedNarrativeView(actor) : false),
      isElevatedPerspective: () =>
        effectiveViewerContext.perspective === 'elevated',
      can,
    }),
    [actor, can, effectiveViewerContext, previewAsPlayer],
  );
}

/** Safe variant when outside WikiProvider — same hook, null actor when no context. */
export function useOptionalCampaignActor(options?: {
  previewAsPlayer?: boolean;
}): CampaignActorHookResult {
  return useCampaignActor(options);
}
