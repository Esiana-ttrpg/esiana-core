import { useOptionalWiki, useWiki } from '@/contexts/WikiContext';

/** Campaign policy affordances from WikiProvider context. */
export function useWikiCampaignPolicy() {
  const wiki = useWiki();
  return {
    actor: wiki.actor,
    can: wiki.can,
    hasElevatedView: wiki.hasElevatedView,
    canManageWiki: wiki.canManageWiki,
    isCampaignOwner: wiki.campaign?.isCampaignOwner ?? false,
    roleLabel: wiki.campaign?.role ?? 'Guest',
  };
}

/** Safe variant when outside WikiProvider (e.g. tests). */
export function useOptionalWikiCampaignPolicy() {
  const wiki = useOptionalWiki();
  if (!wiki) {
    return {
      actor: null,
      can: () => false,
      hasElevatedView: false,
      canManageWiki: false,
      isCampaignOwner: false,
      roleLabel: 'Guest',
    };
  }
  return {
    actor: wiki.actor,
    can: wiki.can,
    hasElevatedView: wiki.hasElevatedView,
    canManageWiki: wiki.canManageWiki,
    isCampaignOwner: wiki.campaign?.isCampaignOwner ?? false,
    roleLabel: wiki.campaign?.role ?? 'Guest',
  };
}

/**
 * Elevated narrative view (ghost mode, staff surfaces).
 * Optional prop override supports legacy `isDMUser` prop drilling during migration.
 */
export function useElevatedNarrativeView(propOverride?: boolean): boolean {
  const wiki = useOptionalWiki();
  if (propOverride !== undefined) return propOverride;
  return wiki?.hasElevatedView ?? false;
}
