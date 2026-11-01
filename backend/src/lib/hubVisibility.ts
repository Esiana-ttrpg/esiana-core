import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { isWikiVisibilityVisibleToViewer } from '../../../shared/narrativeProjection.js';
import { canViewWikiPage, type WikiVisibilityViewer } from './wikiTree.js';

export type HubVisibilityViewer = WikiVisibilityViewer | NarrativeViewerContext;

function isNarrativeViewerContext(
  viewer: HubVisibilityViewer,
): viewer is NarrativeViewerContext {
  return viewer !== null && typeof viewer === 'object' && 'perspective' in viewer;
}

export function isHubPageVisible(
  visibility: string,
  viewer: HubVisibilityViewer,
): boolean {
  if (isNarrativeViewerContext(viewer)) {
    return isWikiVisibilityVisibleToViewer(visibility, viewer);
  }
  return canViewWikiPage(visibility, viewer);
}
