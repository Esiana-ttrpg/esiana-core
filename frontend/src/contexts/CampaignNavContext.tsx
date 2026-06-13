import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  SIDEBAR_COLLAPSED_EVENT,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  getSidebarCollapsedPreference,
  setSidebarCollapsedPreference,
} from '@/lib/sidebarCollapsePreference';

interface CampaignNavContextValue {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

const CampaignNavContext = createContext<CampaignNavContextValue | null>(null);

export function CampaignNavProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() =>
    getSidebarCollapsedPreference(),
  );

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    setSidebarCollapsedPreference(collapsed);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      setSidebarCollapsedPreference(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleCustom = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      if (typeof custom.detail === 'boolean') {
        setSidebarCollapsedState(custom.detail);
      } else {
        setSidebarCollapsedState(getSidebarCollapsedPreference());
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
        setSidebarCollapsedState(getSidebarCollapsedPreference());
      }
    };

    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, handleCustom as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, handleCustom as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
    }),
    [
      sidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
    ],
  );

  return (
    <CampaignNavContext.Provider value={value}>{children}</CampaignNavContext.Provider>
  );
}

export function useCampaignNav(): CampaignNavContextValue {
  const ctx = useContext(CampaignNavContext);
  if (!ctx) {
    throw new Error('useCampaignNav must be used within CampaignNavProvider');
  }
  return ctx;
}

export function useOptionalCampaignNav(): CampaignNavContextValue | null {
  return useContext(CampaignNavContext);
}
