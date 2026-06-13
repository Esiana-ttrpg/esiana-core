import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppHeader } from './AppHeader';
import { Footer } from './Footer';
import { isSystemBannerVisible } from './SystemAnnouncementBanner';
import { fetchPublicSystemStatus } from '@/lib/publicSystem';
import {
  MASTER_PAGE_WIDTH_EVENT,
  getMasterPageWidthPreference,
  pageWidthContainerClasses,
  type MasterPageWidth,
} from '@/lib/pageWidthPreference';

export function AppLayout() {
  const [pageWidth, setPageWidth] = useState<MasterPageWidth>(() =>
    getMasterPageWidthPreference(),
  );
  const [activeBannerText, setActiveBannerText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPublicSystemStatus()
      .then((status) => {
        if (cancelled) return;
        if (!isSystemBannerVisible(status)) {
          setActiveBannerText(null);
          return;
        }
        setActiveBannerText(status.systemBannerText.trim());
      })
      .catch(() => {
        if (!cancelled) setActiveBannerText(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleCustom = (event: Event) => {
      const custom = event as CustomEvent<MasterPageWidth>;
      if (custom.detail) {
        setPageWidth(custom.detail);
      } else {
        setPageWidth(getMasterPageWidthPreference());
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'master-user-page-width') {
        setPageWidth(getMasterPageWidthPreference());
      }
    };

    window.addEventListener(MASTER_PAGE_WIDTH_EVENT, handleCustom as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(
        MASTER_PAGE_WIDTH_EVENT,
        handleCustom as EventListener,
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {activeBannerText ? (
        <div
          role="status"
          className="w-full border-b border-primary/60 bg-primary px-4 py-2 text-center text-sm font-semibold tracking-wide text-background"
        >
          {activeBannerText}
        </div>
      ) : null}
      <AppHeader />
      <main
        className={`flex-1 bg-background py-8 ${pageWidthContainerClasses(pageWidth)}`}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
