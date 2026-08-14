import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { campaignWorkspaceIndexPath } from '@/lib/campaignPaths';
import { parseSystemCategoryKey, SYSTEM_CATEGORY_QUESTS } from '@/lib/wikiSystemCategory';

export interface AdventureRouteContext {
  basePath: string;
  categoryPageId: string;
}

export function useAdventureRoute(): AdventureRouteContext | null {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const { flatPages, resolvePageIdBySystemKey } = useWiki();

  return useMemo(() => {
    if (!campaignHandle) return null;

    const onAdventuresIndex = /^\/campaigns\/[^/]+\/adventures\/?$/.test(
      location.pathname.split('?')[0] ?? '',
    );
    if (!onAdventuresIndex) return null;

    const categoryPageId =
      resolvePageIdBySystemKey(SYSTEM_CATEGORY_QUESTS) ??
      flatPages.find(
        (page) => parseSystemCategoryKey(page.metadata) === SYSTEM_CATEGORY_QUESTS,
      )?.id ??
      flatPages.find((page) => page.title === 'Adventure')?.id;

    if (!categoryPageId) return null;

    return {
      basePath: campaignWorkspaceIndexPath(campaignHandle, 'adventures'),
      categoryPageId,
    };
  }, [campaignHandle, location.pathname, flatPages, resolvePageIdBySystemKey]);
}
