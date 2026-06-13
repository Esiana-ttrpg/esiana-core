import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  campaignDashboardPath,
  campaignEventLorePath,
  campaignWikiPath,
  campaignWorkspaceIndexPath,
  workspaceToSegment,
} from '@/lib/campaignPaths';
import {
  isCategoryIndexPage,
  resolveWorkspaceIndexPathForFolderTitle,
} from '@/lib/campaignWorkspaceRoutes';
import { useWiki } from '@/contexts/WikiContext';
import { isEventLorePageId } from '@/lib/wiki';
import type { WikiBreadcrumb } from '@/lib/wikiHierarchy';
import { SURFACE_RECESSED_CLASS } from '@/lib/surfaceLayout';
import { resolveWorkspaceForPage } from '@shared/wikiWorkspaceResolve';

export const WIKI_ROOT_CRUMB_ID = '__wiki_root__';

interface WikiPageBreadcrumbsProps {
  crumbs: WikiBreadcrumb[];
  campaignHandle: string;
}

function breadcrumbHref(
  campaignHandle: string,
  pageId: string,
  flatPages: ReturnType<typeof useWiki>['flatPages'],
  crumbTitle?: string,
): string {
  if (pageId === WIKI_ROOT_CRUMB_ID) {
    return campaignDashboardPath(campaignHandle);
  }
  if (isEventLorePageId(pageId)) {
    return campaignEventLorePath(campaignHandle, pageId.slice('event-'.length));
  }

  const page = flatPages.find((entry) => entry.id === pageId);
  const title = (crumbTitle ?? page?.title ?? '').trim();

  if (page?.pathKey) {
    return campaignWikiPath(campaignHandle, pageId, flatPages);
  }

  if (title && isCategoryIndexPage(title)) {
    const indexPath = resolveWorkspaceIndexPathForFolderTitle(campaignHandle, title);
    if (indexPath) return indexPath;
  }

  if (page) {
    const workspace =
      (page.workspace as Parameters<typeof workspaceToSegment>[0] | null | undefined) ??
      resolveWorkspaceForPage(page, flatPages);
    if (workspace) {
      const segment = workspaceToSegment(workspace);
      if (segment) {
        return campaignWorkspaceIndexPath(campaignHandle, segment);
      }
    }
  }

  return campaignWikiPath(campaignHandle, pageId, flatPages);
}

export function WikiPageBreadcrumbs({
  crumbs,
  campaignHandle,
}: WikiPageBreadcrumbsProps) {
  const { flatPages } = useWiki();

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`${SURFACE_RECESSED_CLASS} mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-medium`}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span
            key={crumb.id}
            className="inline-flex min-w-0 items-center gap-2"
          >
            {index > 0 && (
              <ChevronRight className="size-3 shrink-0" aria-hidden />
            )}
            {isLast ? (
              <span className="truncate text-foreground/90">{crumb.title}</span>
            ) : (
              <Link
                to={breadcrumbHref(campaignHandle, crumb.id, flatPages, crumb.title)}
                className="truncate hover:text-foreground"
              >
                {crumb.title}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
