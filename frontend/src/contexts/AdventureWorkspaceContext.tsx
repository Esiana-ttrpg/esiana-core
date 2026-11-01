import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useWiki } from '@/contexts/WikiContext';
import { useAdventureRoute } from '@/hooks/useAdventureRoute';
import {
  adventureHidesGmChrome,
  adventurePublicPreviewEligible,
  isAdventurePublicPreview,
  type AdventurePreviewPerspective,
} from '@/lib/adventurePreview';
import {
  patchAdventurePerspective,
  readAdventurePerspective,
} from '@/lib/workspacePersistence';

interface AdventureWorkspaceContextValue {
  active: boolean;
  perspective: AdventurePreviewPerspective;
  setPerspective: (value: AdventurePreviewPerspective) => void;
  playerPreview: boolean;
  publicPreview: boolean;
  publicPreviewEligible: boolean;
  isDMUser: boolean;
}

const AdventureWorkspaceContext = createContext<AdventureWorkspaceContextValue | null>(null);

export function AdventureWorkspaceProvider({ children }: { children: ReactNode }) {
  const adventureRoute = useAdventureRoute();
  const { hasElevatedView, campaignHandle, campaign } = useWiki();
  const [perspective, setPerspectiveState] = useState<AdventurePreviewPerspective>(() =>
    readAdventurePerspective(campaignHandle),
  );

  const isDMUser = hasElevatedView;

  useEffect(() => {
    setPerspectiveState(readAdventurePerspective(campaignHandle));
  }, [campaignHandle]);

  const setPerspective = useCallback(
    (next: AdventurePreviewPerspective) => {
      setPerspectiveState(next);
      if (campaignHandle) patchAdventurePerspective(campaignHandle, next);
    },
    [campaignHandle],
  );

  const value = useMemo(
    () => ({
      active: adventureRoute != null,
      perspective,
      setPerspective,
      playerPreview: adventureHidesGmChrome(perspective),
      publicPreview: isAdventurePublicPreview(perspective),
      publicPreviewEligible: adventurePublicPreviewEligible(campaign?.discoverability),
      isDMUser,
    }),
    [adventureRoute, campaign?.discoverability, isDMUser, perspective, setPerspective],
  );

  return (
    <AdventureWorkspaceContext.Provider value={value}>
      {children}
    </AdventureWorkspaceContext.Provider>
  );
}

export function useAdventureWorkspace(): AdventureWorkspaceContextValue {
  const ctx = useContext(AdventureWorkspaceContext);
  if (!ctx) {
    throw new Error('useAdventureWorkspace must be used within AdventureWorkspaceProvider');
  }
  return ctx;
}

export function useOptionalAdventureWorkspace(): AdventureWorkspaceContextValue | null {
  return useContext(AdventureWorkspaceContext);
}
