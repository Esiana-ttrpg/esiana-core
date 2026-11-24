import { canViewWikiPage, type WikiVisibilityViewer } from './wikiTree.js';

export function canViewMapAsset(
  visibility: string,
  role: WikiVisibilityViewer,
): boolean {
  return canViewWikiPage(visibility, role);
}
