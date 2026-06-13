import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useWiki } from '@/contexts/WikiContext';
import { useAdventureRoute } from '@/hooks/useAdventureRoute';

interface AdventureWorkspaceContextValue {
  active: boolean;
  playerPreview: boolean;
  setPlayerPreview: (value: boolean) => void;
  togglePlayerPreview: () => void;
  isDMUser: boolean;
}

const AdventureWorkspaceContext = createContext<AdventureWorkspaceContextValue | null>(null);

export function AdventureWorkspaceProvider({ children }: { children: ReactNode }) {
  const adventureRoute = useAdventureRoute();
  const { hasElevatedView } = useWiki();
  const [playerPreview, setPlayerPreview] = useState(false);

  const isDMUser = hasElevatedView;

  const togglePlayerPreview = useCallback(() => {
    setPlayerPreview((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      active: adventureRoute != null,
      playerPreview,
      setPlayerPreview,
      togglePlayerPreview,
      isDMUser,
    }),
    [adventureRoute, playerPreview, togglePlayerPreview, isDMUser],
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
