import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import {
  ArrowUpCircle,
  BarChart3,
  HardDrive,
  Brush,
  Clock3,
  Fingerprint,
  FlaskConical,
  Puzzle,
  Settings2,
  Swords,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { SystemAnnouncementBanner } from '@/components/layout/SystemAnnouncementBanner';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { AdminNavProvider, useAdminNav } from '@/contexts/AdminNavContext';
import { useAdminSampleDataEnabled } from '@/hooks/useAdminSampleDataEnabled';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { UserRoles } from '@/types/domain';
import type { AdminNavItem } from '@/components/admin/AdminSidebarNav';

const SYSTEM_CONFIG_NAV: AdminNavItem[] = [
  {
    to: '/admin/settings/general',
    label: 'General Settings',
    icon: Settings2,
  },
  {
    to: '/admin/settings/assets',
    label: 'Assets & Uploads',
    icon: Upload,
  },
  {
    to: '/admin/settings/storage',
    label: 'Storage',
    icon: HardDrive,
  },
  {
    to: '/admin/settings/identity-providers',
    label: 'Identity Providers',
    icon: Fingerprint,
  },
  {
    to: '/admin/settings/appearance',
    label: 'Appearance',
    icon: Brush,
  },
  {
    to: '/admin/settings/plugins',
    label: 'Plugins & Integrations',
    icon: Puzzle,
  },
  {
    to: '/admin/config/update',
    label: 'Update Core',
    icon: ArrowUpCircle,
  },
  {
    to: '/admin/config/utilities',
    label: 'System Utilities',
    icon: Wrench,
  },
  {
    to: '/admin/config/background-tasks',
    label: 'Background Tasks',
    icon: Clock3,
  },
  {
    to: '/admin/config/campaigns',
    label: 'Campaigns',
    icon: Swords,
  },
  {
    to: '/admin/memberships',
    label: 'Memberships',
    icon: Users,
  },
  {
    to: '/admin/analytics/usage',
    label: 'API Usage',
    icon: BarChart3,
  },
];

const SAMPLE_DATA_NAV_ITEM: AdminNavItem = {
  to: '/admin/config/sample-data',
  label: 'Sample Data',
  icon: FlaskConical,
};

function AdminLayoutShell() {
  const { navOpen, closeNav } = useAdminNav();
  const { enabled: sampleDataEnabled } = useAdminSampleDataEnabled();
  const { isUpdateAvailable, latestVersion } = useVersionCheck();

  const navItems = useMemo(() => {
    if (!sampleDataEnabled) return SYSTEM_CONFIG_NAV;
    const items = [...SYSTEM_CONFIG_NAV];
    const campaignsIndex = items.findIndex((item) => item.to === '/admin/config/campaigns');
    items.splice(campaignsIndex + 1, 0, SAMPLE_DATA_NAV_ITEM);
    return items;
  }, [sampleDataEnabled]);

  useBodyScrollLock(navOpen);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNav();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen, closeNav]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SystemAnnouncementBanner />
      <AppHeader />

      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64">
        <AdminSidebarNav
          items={navItems}
          className="h-screen w-full"
          isUpdateAvailable={isUpdateAvailable}
          latestVersion={latestVersion}
        />
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={closeNav}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 left-0 flex shadow-2xl">
            <AdminSidebarNav
              items={navItems}
              onNavigate={closeNav}
              onClose={closeNav}
              isUpdateAvailable={isUpdateAvailable}
              latestVersion={latestVersion}
            />
          </div>
        </div>
      )}

      <div className="mx-auto flex-1 max-w-7xl overflow-x-hidden bg-background px-4 py-8 sm:px-6 md:ml-64 lg:px-8">
        <main className="min-w-0 text-foreground">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { user, isAuthenticated, loading } = useAuth();

  if (!loading && (!isAuthenticated || user?.role !== UserRoles.SYSTEM_ADMIN)) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <LoadingSpinner label="Verifying system admin access…" />
      </div>
    );
  }

  return (
    <AdminNavProvider>
      <AdminLayoutShell />
    </AdminNavProvider>
  );
}
