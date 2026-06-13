import { segmentToWorkspace } from '@shared/campaignWorkspaceRoutes';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import { isEventLorePageId } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

export function workspaceSegmentFromCampaignPath(
  pathname: string,
  campaignHandle: string,
): string | null {
  const prefix = `/campaigns/${campaignHandle}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segment = rest.split('/')[0];
  return segment || null;
}

export function resolveWikiRoutePageId(input: {
  pathname: string;
  campaignHandle: string;
  pathKey?: string;
  pageId?: string;
  flatPages: readonly WikiTreeNode[];
}): string {
  const { pathname, campaignHandle, pathKey, pageId, flatPages } = input;

  if (pageId && isEventLorePageId(pageId)) {
    return pageId;
  }

  if (pathKey) {
    const segment = workspaceSegmentFromCampaignPath(pathname, campaignHandle);
    const workspace = segment ? segmentToWorkspace(segment) : null;
    if (workspace) {
      const match = flatPages.find(
        (page) => page.workspace === workspace && page.pathKey === pathKey,
      );
      if (match) return match.id;
    }

    // Transitional: some links still emit internal page ids in the URL segment.
    const byId = flatPages.find((page) => page.id === pathKey);
    if (byId) return byId.id;
  }

  return pageId ?? '';
}

export function isFreeformPagesRoute(pathname: string, campaignHandle: string): boolean {
  const segment = workspaceSegmentFromCampaignPath(pathname, campaignHandle);
  return segment === 'pages' && pathname.split('/').length > pathname.replace(/\/$/, '').split('/').length - 1;
}

export function shouldBlockFreeformRoute(
  pathname: string,
  campaignHandle: string,
  page: Pick<WikiTreeNode, 'workspace'> | null | undefined,
): boolean {
  if (!page?.workspace) return false;
  const segment = workspaceSegmentFromCampaignPath(pathname, campaignHandle);
  const isPagesDetail =
    segment === 'pages' && pathname.split('/').filter(Boolean).length > 3;
  if (!isPagesDetail) return false;
  return page.workspace !== CampaignWorkspace.PAGES;
}
