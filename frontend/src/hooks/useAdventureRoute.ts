import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import {
  readAdventureSectionFromSearch,
  type AdventureSectionId,
} from '@/lib/adventureLayout';
import { campaignWorkspaceIndexPath } from '@/lib/campaignPaths';
import { parseSystemCategoryKey, SYSTEM_CATEGORY_QUESTS } from '@/lib/wikiSystemCategory';

export interface AdventureRouteContext {
  basePath: string;
  activeSection: AdventureSectionId;
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
      activeSection: readAdventureSectionFromSearch(location.search),
      categoryPageId,
    };
  }, [campaignHandle, location.pathname, location.search, flatPages, resolvePageIdBySystemKey]);
}
