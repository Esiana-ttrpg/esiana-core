import { wikiPageHasRouteAlias } from '@shared/wikiWorkspaceResolve';
import { segmentToWorkspace, resolveCanonicalPagePath } from '@shared/campaignWorkspaceRoutes';
import { CampaignWorkspace } from '@shared/campaignWorkspace';
import { isEventLorePageId } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

/** Current location values take precedence over canonical defaults. */
export function mergeWikiRouteSearch(path: string, search: string): string {
  const [pathname, canonicalSearch = ''] = path.split('?');
  const params = new URLSearchParams(search);
  const currentKeys = new Set(params.keys());
  const canonical = new URLSearchParams(canonicalSearch);
  for (const [key, value] of canonical) if (!currentKeys.has(key)) params.append(key, value);
  const query = params.toString();
  return pathname + (query ? `?${query}` : '');
}

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
      const alias = flatPages.find(page => wikiPageHasRouteAlias(page, workspace, pathKey));
      if (alias) return alias.id;
    }

    // Transitional: some links still emit internal page ids in the URL segment.
    const byId = flatPages.find((page) => page.id === pathKey);
    if (byId) return byId.id;
  }

  return pageId ?? '';
}

/** Known documents always resolve through the wiki registry before interpreting old URLs. */
export function resolveWikiNavigation(input: Parameters<typeof resolveWikiRoutePageId>[0]) {
  const pageId = resolveWikiRoutePageId(input);
  const page = input.flatPages.find(row => row.id === pageId);
  if (page) return { page, path: resolveCanonicalPagePath(input.campaignHandle, page, input.flatPages) };
  const segment = workspaceSegmentFromCampaignPath(input.pathname, input.campaignHandle);
  const legacy = input.pathKey ?? input.pageId ?? '';
  const legacyNamespace = segment === 'pages' || !!input.pageId && segment !== 'wiki';
  if (legacyNamespace && /^event-[a-zA-Z0-9_-]+$/.test(legacy)) {
    return { page: undefined, path: `/campaigns/${input.campaignHandle}/events/${encodeURIComponent(legacy.slice(6))}` };
  }
  if (segment === 'pages' && legacy === 'present') return { page: undefined, path: `/campaigns/${input.campaignHandle}/eras` };
  return { page: undefined, path: undefined };
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
