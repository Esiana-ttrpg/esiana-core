import type { CampaignContext } from '../types/api.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { CampaignCapabilities, type CampaignCapability } from '../../../shared/campaignPolicy/capabilities.js';
import { canViewSharedPartyBaseline, canViewVisibility } from '../../../shared/campaignPolicy/resourceAccess.js';
import { canManageNotebooksFromActor, hasElevatedNarrativeView } from './acl.js';
import type { WikiVisibilityViewer } from './wikiTree.js';

/** Resolve once per request. A preview can only narrow the real campaign actor. */
export function resolveAdventureAudience(
  scope: CampaignContext,
  requested: unknown,
  viewer: NarrativeViewerContext | null,
) {
  const requestedParty = requested === 'true' || requested === '1';
  const preview = requestedParty && (canManageNotebooksFromActor(scope.actor) || hasElevatedNarrativeView(scope.actor));
  if (!preview) return {
    preview: false,
    visibilityViewer: scope as WikiVisibilityViewer,
    narrativeViewer: viewer,
    canViewPage: (visibility: string) => canViewVisibility(scope.actor, visibility),
  };
  const capabilities = new Set<CampaignCapability>();
  if (canViewSharedPartyBaseline(scope.actor, 'Public')) capabilities.add(CampaignCapabilities.CAMPAIGN_VIEW);
  if (canViewSharedPartyBaseline(scope.actor, 'Party')) capabilities.add(CampaignCapabilities.WIKI_VIEW_PARTY);
  const narrativeViewer: NarrativeViewerContext | null = viewer ? {
    ...viewer,
    role: null,
    perspective: 'party',
    capabilities: {
      canManageChronology: false, canRevealContent: false, canUseGhostMode: false,
      isElevatedWiki: false, isElevatedMap: false,
    },
  } : null;
  return {
    preview: true,
    visibilityViewer: { capabilities } as WikiVisibilityViewer,
    narrativeViewer,
    canViewPage: (visibility: string) => canViewSharedPartyBaseline(scope.actor, visibility),
  };
}
