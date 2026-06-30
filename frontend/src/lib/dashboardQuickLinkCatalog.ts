import { useMemo } from 'react';
import {
  DEFAULT_DASHBOARD_QUICK_LINKS,
  DASHBOARD_QUICK_LINK_KEYS,
  DASHBOARD_QUICK_LINK_MAX,
  normalizeDashboardQuickLinkKeys,
  type DashboardQuickLinkKey,
} from '@shared/dashboardQuickLinkCatalog';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignChronologyPath,
  campaignNotesPath,
  campaignPartyPath,
  campaignPath,
  campaignWikiPath,
} from '@/lib/campaignPaths';
import { resolveWikiIndexPageId } from '@/lib/wikiIndexEntry';

export {
  DEFAULT_DASHBOARD_QUICK_LINKS,
  DASHBOARD_QUICK_LINK_KEYS,
  DASHBOARD_QUICK_LINK_MAX,
  normalizeDashboardQuickLinkKeys,
  type DashboardQuickLinkKey,
};

export type ResolvedQuickLink = {
  key: DashboardQuickLinkKey;
  label: string;
  to: string;
};

export function useResolvedDashboardQuickLinks(
  campaignHandle: string,
  config: Record<string, unknown> | undefined,
  options?: { isLookingForGroup?: boolean },
): ResolvedQuickLink[] {
  const { resolvePageId, flatPages } = useWiki();
  const keys = normalizeDashboardQuickLinkKeys(config?.links);

  const codexPath = useMemo(() => {
    const pageId = resolveWikiIndexPageId(resolvePageId, flatPages);
    return pageId ? campaignWikiPath(campaignHandle, pageId, flatPages) : null;
  }, [campaignHandle, flatPages, resolvePageId]);

  return keys
    .map((key) => resolveQuickLink(key, campaignHandle, codexPath, options?.isLookingForGroup))
    .filter((link): link is ResolvedQuickLink => link !== null);
}

function resolveQuickLink(
  key: DashboardQuickLinkKey,
  campaignHandle: string,
  codexPath: string | null,
  isLookingForGroup?: boolean,
): ResolvedQuickLink | null {
  switch (key) {
    case 'codex':
      return codexPath ? { key, label: 'Codex', to: codexPath } : null;
    case 'sessionNotes':
      return { key, label: 'Session notes', to: campaignNotesPath(campaignHandle) };
    case 'chronology':
      return { key, label: 'Chronology', to: campaignChronologyPath(campaignHandle) };
    case 'party':
      return { key, label: 'Party', to: campaignPartyPath(campaignHandle) };
    case 'maps':
      return { key, label: 'Maps', to: campaignPath(campaignHandle, 'maps') };
    case 'threads':
      return { key, label: 'Threads', to: campaignPath(campaignHandle, 'threads') };
    case 'adventures':
      return { key, label: 'Adventure', to: campaignPath(campaignHandle, 'adventures') };
    case 'recruitment':
      return isLookingForGroup
        ? { key, label: 'Recruitment', to: campaignPath(campaignHandle, 'recruitment') }
        : null;
    default:
      return null;
  }
}
