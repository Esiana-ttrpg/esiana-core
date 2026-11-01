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
import { useBranding } from '@/contexts/BrandingContext';
import { useAdventureRoute } from '@/hooks/useAdventureRoute';
import {
  adventureHidesGmChrome,
  adventurePublicPreviewEligible,
  adventurePublicPreviewGate,
  isAdventurePublicPreview,
  type AdventurePreviewPerspective,
} from '@/lib/adventurePreview';
import type { PublicPreviewGate } from '@shared/campaignPolicy/publicAccess';
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
  publicPreviewGate: PublicPreviewGate;
  isDMUser: boolean;
}

const AdventureWorkspaceContext = createContext<AdventureWorkspaceContextValue | null>(null);

export function AdventureWorkspaceProvider({ children }: { children: ReactNode }) {
  const adventureRoute = useAdventureRoute();
  const { hasElevatedView, campaignHandle, campaign } = useWiki();
  const { instanceRequiresLogin } = useBranding();
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

  const effectivePerspective: AdventurePreviewPerspective = isDMUser
    ? perspective
    : 'dm';

  const value = useMemo(
    () => ({
      active: adventureRoute != null,
      perspective: effectivePerspective,
      setPerspective,
      playerPreview: adventureHidesGmChrome(effectivePerspective),
      publicPreview: isAdventurePublicPreview(effectivePerspective),
      publicPreviewEligible: adventurePublicPreviewEligible(campaign?.discoverability),
      publicPreviewGate: adventurePublicPreviewGate(
        campaign?.discoverability,
        instanceRequiresLogin,
      ),
      isDMUser,
    }),
    [
      adventureRoute,
      campaign?.discoverability,
      effectivePerspective,
      instanceRequiresLogin,
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
