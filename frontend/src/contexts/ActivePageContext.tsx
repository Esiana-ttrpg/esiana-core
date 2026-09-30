import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ActivePageSnapshot } from '@/lib/commands/types';

interface ActivePageContextValue {
  snapshot: ActivePageSnapshot | null;
  enterEditMode: (() => void) | null;
  publish: (
    snapshot: ActivePageSnapshot,
    enterEditMode: () => void,
  ) => void;
  clear: () => void;
}

const ActivePageContext = createContext<ActivePageContextValue | null>(null);

export function ActivePageProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ActivePageSnapshot | null>(null);
  const [enterEditMode, setEnterEditMode] = useState<(() => void) | null>(
    null,
  );

  const publish = useCallback(
    (next: ActivePageSnapshot, enter: () => void) => {
      setSnapshot(next);
      setEnterEditMode(() => enter);
    },
    [],
  );

  const clear = useCallback(() => {
    setSnapshot(null);
    setEnterEditMode(null);
  }, []);

  const value = useMemo(
    () => ({ snapshot, enterEditMode, publish, clear }),
    [snapshot, enterEditMode, publish, clear],
  );

  return (
    <ActivePageContext.Provider value={value}>
      {children}
    </ActivePageContext.Provider>
  );
}

export function useActivePage(): ActivePageContextValue {
  const ctx = useContext(ActivePageContext);
  if (!ctx) {
    throw new Error('useActivePage must be used within ActivePageProvider');
  }
  return ctx;
}

/** Safe variant for surfaces that may render outside the provider in tests. */
export function useActivePageOptional(): ActivePageContextValue | null {
  return useContext(ActivePageContext);
}
