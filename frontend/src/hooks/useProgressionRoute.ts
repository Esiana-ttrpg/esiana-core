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

const PROGRESSION_INDEX_PATH = /^\/campaigns\/[^/]+\/progression\/?$/;

export function isProgressionIndexPath(pathname: string): boolean {
  return PROGRESSION_INDEX_PATH.test(pathname.split('?')[0] ?? '');
}

export function useProgressionRoute(): ProgressionRouteContext | null {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();

  return useMemo(() => {
    if (!campaignHandle) return null;

    if (!isProgressionIndexPath(location.pathname)) return null;

    return {
      basePath: campaignProgressionPath(campaignHandle),
      activeSection: readProgressionSectionFromSearch(location.search, campaignHandle),
    };
  }, [campaignHandle, location.pathname, location.search]);
}
