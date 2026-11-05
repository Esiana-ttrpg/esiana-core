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
  ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE,
  type AdventurePreviewPerspective,
} from '@/lib/adventurePreview';
import {
  clearLegacyAdventurePerspectives,
  patchAdventurePerspective,
  readAdventurePerspective,
} from '@/lib/workspacePersistence';

interface AdventureWorkspaceContextValue {
  active: boolean;
  perspective: AdventurePreviewPerspective;
  setPerspective: (value: AdventurePreviewPerspective) => void;
  playerPreview: boolean;
  isDMUser: boolean;
}

const AdventureWorkspaceContext = createContext<AdventureWorkspaceContextValue | null>(null);

export function AdventureWorkspaceProvider({ children }: { children: ReactNode }) {
  const adventureRoute = useAdventureRoute();
  const { hasElevatedView, campaignHandle } = useWiki();
  const [perspective, setPerspectiveState] = useState<AdventurePreviewPerspective | null>(() =>
    readAdventurePerspective(campaignHandle),
  );

  const isDMUser = hasElevatedView;

  useEffect(() => { clearLegacyAdventurePerspectives(); }, []);

  useEffect(() => {
    setPerspectiveState(readAdventurePerspective(campaignHandle));
  }, [campaignHandle]);

  const setPerspective = useCallback(
    (next: AdventurePreviewPerspective) => {
      if (next !== 'dm' && !ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE) return;
      setPerspectiveState(next);
      if (campaignHandle) patchAdventurePerspective(campaignHandle, next);
    },
    [campaignHandle],
  );

  const effectivePerspective: AdventurePreviewPerspective = !isDMUser
    ? 'party'
    : ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE ? perspective ?? 'dm' : 'dm';

  const value = useMemo(
    () => ({
      active: adventureRoute != null,
      perspective: effectivePerspective,
      setPerspective,
      playerPreview: adventureHidesGmChrome(effectivePerspective),
      isDMUser,
    }),
    [
      adventureRoute,
      effectivePerspective,
      isDMUser,
      setPerspective,
    ],
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
