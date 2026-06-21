import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { isWikiVisibilityVisibleToViewer } from '../../../shared/narrativeProjection.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { canViewWikiPage } from './wikiTree.js';

export type HubVisibilityViewer =
  | CampaignMemberRole
  | null
  | NarrativeViewerContext;

export function isHubPageVisible(
  visibility: string,
  viewer: HubVisibilityViewer,
): boolean {
  if (viewer !== null && typeof viewer === 'object' && 'perspective' in viewer) {
    return isWikiVisibilityVisibleToViewer(visibility, viewer);
  }
  return canViewWikiPage(visibility, viewer);
}
