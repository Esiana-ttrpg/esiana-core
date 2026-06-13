import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AdminNavContextValue {
  navOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
}

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((open) => !open), []);

  const value = useMemo(
    () => ({
      navOpen,
      openNav,
      closeNav,
      toggleNav,
    }),
    [navOpen, openNav, closeNav, toggleNav],
  );

  return (
    <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>
  );
}

export function useAdminNav(): AdminNavContextValue {
  const ctx = useContext(AdminNavContext);
  if (!ctx) {
    throw new Error('useAdminNav must be used within AdminNavProvider');
  }
  return ctx;
}

export function useOptionalAdminNav(): AdminNavContextValue | null {
  return useContext(AdminNavContext);
}
