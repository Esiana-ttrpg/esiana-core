import { useMemo } from 'react';
import {
  can as policyCan,
  hasElevatedNarrativeView,
  type CampaignActor,
} from '@shared/campaignPolicy/policy';
import type { CampaignCapability } from '@shared/campaignPolicy/capabilities';
import type { NarrativeViewerContext } from '@shared/narrativeProjection';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { useNarrativeViewerContext } from '@/hooks/useNarrativeViewerContext';
import { buildAdventurePublicPreviewActor } from '@/lib/adventurePreview';

export type CampaignActorHookResult = {
  actor: CampaignActor | null;
  viewerContext: NarrativeViewerContext;
  previewAsPlayer: boolean;
  previewAsPublic: boolean;
  previewActor: CampaignActor | null;
  isElevated: () => boolean;
  isElevatedPerspective: () => boolean;
  can: (cap: CampaignCapability) => boolean;
  previewCan: (cap: CampaignCapability) => boolean;
};

const EMPTY_CAN = (_cap: CampaignCapability) => false;

/** Canonical campaign actor + narrative viewer context. Never reconstructs actor from partial inputs. */
export function useCampaignActor(options?: {
  previewAsPlayer?: boolean;
  previewAsPublic?: boolean;
}): CampaignActorHookResult {
  const wiki = useOptionalWiki();
  const actor = wiki?.actor ?? null;
  const hasElevatedView = wiki?.hasElevatedView ?? false;
  const can = wiki?.can ?? EMPTY_CAN;
  const campaign = wiki?.campaign;
  const campaignHandle = wiki?.campaignHandle ?? '';

  const previewAsPublic = Boolean(options?.previewAsPublic) && hasElevatedView;
  const previewAsPlayer =
    Boolean(options?.previewAsPlayer) && !previewAsPublic && hasElevatedView;

  const viewerContext = useNarrativeViewerContext({
    campaignHandle,
    role: campaign?.role,
    allowPlayerChronologyManagement: campaign?.allowPlayerChronologyManagement,
  });

  const previewActor = useMemo(() => {
    if (!previewAsPublic || !actor) return actor;
    return buildAdventurePublicPreviewActor(actor.campaign);
  }, [actor, previewAsPublic]);

  const effectiveViewerContext = useMemo(() => {
    if (previewAsPublic || previewAsPlayer) {
      return { ...viewerContext, perspective: 'party' as const };
    }
    return viewerContext;
  }, [previewAsPlayer, previewAsPublic, viewerContext]);

  const previewCan = useMemo(() => {
    if (!previewAsPublic || !previewActor) return can;
    return (cap: CampaignCapability) => policyCan(previewActor, cap);
  }, [can, previewActor, previewAsPublic]);

  return useMemo(
    () => ({
      actor,
      viewerContext: effectiveViewerContext,
      previewAsPlayer,
      previewAsPublic,
      previewActor,
      isElevated: () => (actor ? hasElevatedNarrativeView(actor) : false),
      isElevatedPerspective: () =>
        effectiveViewerContext.perspective === 'elevated',
      can,
      previewCan,
    }),
    [
      actor,
      can,
      effectiveViewerContext,
      previewActor,
      previewAsPlayer,
      previewAsPublic,
      previewCan,
    ],
  );
}

/** Safe variant when outside WikiProvider — same hook, null actor when no context. */
export function useOptionalCampaignActor(options?: {
  previewAsPlayer?: boolean;
  previewAsPublic?: boolean;
}): CampaignActorHookResult {
  return useCampaignActor(options);
}
