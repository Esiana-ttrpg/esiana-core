import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import {
  readProgressionSectionFromSearch,
  type ProgressionSectionId,
} from '@/lib/progressionLayout';

export interface ProgressionRouteContext {
  basePath: string;
  activeSection: ProgressionSectionId;
}

export function useProgressionRoute(): ProgressionRouteContext | null {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();

  return useMemo(() => {
    if (!campaignHandle) return null;

    const onProgressionIndex = /^\/campaigns\/[^/]+\/progression\/?$/.test(
      location.pathname.split('?')[0] ?? '',
    );
    if (!onProgressionIndex) return null;

    return {
      basePath: campaignProgressionPath(campaignHandle),
      activeSection: readProgressionSectionFromSearch(location.search, campaignHandle),
    };
  }, [campaignHandle, location.pathname, location.search]);
}
