import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import {
  readDowntimeSectionFromSearch,
  type DowntimeSectionId,
} from '@/lib/downtimeLayout';
import { campaignDowntimeHubPath } from '@/lib/campaignPaths';
import { parseSystemCategoryKey, SYSTEM_CATEGORY_DOWNTIME } from '@/lib/wikiSystemCategory';

export interface DowntimeRouteContext {
  basePath: string;
  activeSection: DowntimeSectionId | null;
  categoryPageId: string;
}

export function useDowntimeRoute(): DowntimeRouteContext | null {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const { flatPages, resolvePageIdBySystemKey } = useWiki();

  return useMemo(() => {
    if (!campaignHandle) return null;

    const onDowntimeIndex = /^\/campaigns\/[^/]+\/downtime\/?$/.test(
      location.pathname.split('?')[0] ?? '',
    );
    if (!onDowntimeIndex) return null;

    const categoryPageId =
      resolvePageIdBySystemKey(SYSTEM_CATEGORY_DOWNTIME) ??
      flatPages.find(
        (page) => parseSystemCategoryKey(page.metadata) === SYSTEM_CATEGORY_DOWNTIME,
      )?.id ??
      flatPages.find((page) => page.title === 'Downtime')?.id;

    if (!categoryPageId) return null;

    return {
      basePath: campaignDowntimeHubPath(campaignHandle),
      activeSection: readDowntimeSectionFromSearch(location.search),
      categoryPageId,
    };
  }, [campaignHandle, location.pathname, location.search, flatPages, resolvePageIdBySystemKey]);
}
