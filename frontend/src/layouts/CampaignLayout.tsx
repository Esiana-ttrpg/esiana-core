import { Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Footer } from '@/components/layout/Footer';
import { SystemAnnouncementBanner } from '@/components/layout/SystemAnnouncementBanner';
import { WikiProvider, useWiki } from '@/contexts/WikiContext';
import { useAuth } from '@/contexts/AuthContext';
import { campaignAppearanceFromApi, useBranding } from '@/contexts/BrandingContext';
import { SceneCompositionProvider } from '@/contexts/SceneCompositionContext';
import { CampaignNavProvider, useCampaignNav } from '@/contexts/CampaignNavContext';
import { PluginRuntimeProvider } from '@/plugins/PluginRuntimeProvider';
import { Sidebar } from '@/components/Sidebar';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { applyToCampaignBySlugRecruitment } from '@/lib/campaigns';
import {
  MASTER_PAGE_WIDTH_EVENT,
  getMasterPageWidthPreference,
  pageWidthContainerClasses,
  type MasterPageWidth,
} from '@/lib/pageWidthPreference';
import {
  resolveWorkspaceComposition,
  shellClassesForComposition,
} from '@/lib/workspaceComposition';
import {
  CANVAS_ATMOSPHERE_AMBIENT_CLASS,
  WORKSPACE_SURFACE_CLASS,
} from '@/lib/surfaceLayout';
import { AdventureWorkspaceProvider } from '@/contexts/AdventureWorkspaceContext';
import { WorkspaceContextStrip } from '@/components/layout/WorkspaceContextStrip';
import { WorkspaceRail } from '@/components/layout/WorkspaceRail';
import { useWorkspaceChrome } from '@/hooks/useWorkspaceChrome';

function CampaignThemeBridge() {
  const { campaign } = useWiki();
  const { setCampaignAppearance } = useBranding();

  useEffect(() => {
    const partial = campaignAppearanceFromApi(
      campaign?.appearanceProfile,
      campaign?.themePreset,
    );
    setCampaignAppearance(partial);
    return () => {
      setCampaignAppearance(null);
    };
  }, [
    campaign?.appearanceProfile,
    campaign?.themePreset,
    setCampaignAppearance,
  ]);

  return null;
}

const PENDING_INVITE_STORAGE_KEY = 'esiana.pendingCampaignInvite';

interface PendingInviteRecord {
  campaignHandle: string;
  inviteToken: string;
}

function readPendingInvite(): PendingInviteRecord | null {
  try {
    const raw = window.localStorage.getItem(PENDING_INVITE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingInviteRecord>;
    if (
      typeof parsed?.campaignHandle !== 'string' ||
      typeof parsed?.inviteToken !== 'string'
    ) {
      return null;
    }
    const campaignHandle = parsed.campaignHandle.trim();
    const inviteToken = parsed.inviteToken.trim();
    if (!campaignHandle || !inviteToken) return null;
    return { campaignHandle, inviteToken };
  } catch {
    return null;
  }
}

function writePendingInvite(record: PendingInviteRecord): void {
  window.localStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(record));
}

function clearPendingInvite(): void {
  window.localStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
}

function InviteJoinBridge() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refresh } = useWiki();
  const inviteTokenFromUrl = searchParams.get('invite')?.trim() ?? '';
  const [joinError, setJoinError] = useState<string | null>(null);
  const applyingRef = useRef(false);

  const pendingInvite = useMemo(() => readPendingInvite(), [campaignHandle, inviteTokenFromUrl]);

  useEffect(() => {
    if (!campaignHandle || !inviteTokenFromUrl) return;
    writePendingInvite({ campaignHandle, inviteToken: inviteTokenFromUrl });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('invite');
    setSearchParams(nextParams, { replace: true });
  }, [campaignHandle, inviteTokenFromUrl, searchParams, setSearchParams]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !campaignHandle || applyingRef.current) return;
    if (
      !pendingInvite ||
      pendingInvite.campaignHandle !== campaignHandle ||
      !pendingInvite.inviteToken
    ) {
      return;
    }

    applyingRef.current = true;
    setJoinError(null);

    void (async () => {
      try {
        await applyToCampaignBySlugRecruitment(
          campaignHandle,
          undefined,
          pendingInvite.inviteToken,
        );
        clearPendingInvite();
        await refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (/already a member/i.test(message)) {
          clearPendingInvite();
          await refresh();
          return;
        }
        setJoinError(message || 'Unable to join this campaign with the invite link.');
      } finally {
        applyingRef.current = false;
      }
    })();
  }, [authLoading, campaignHandle, isAuthenticated, pendingInvite, refresh]);

  if (!joinError) return null;

  return (
    <div className="mx-4 mt-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200 sm:mx-6 lg:mx-8">
      {joinError}
    </div>
  );
}

function CampaignLayoutShell() {
  const { sidebarOpen, closeSidebar, sidebarCollapsed } = useCampaignNav();
  const [pageWidth, setPageWidth] = useState<MasterPageWidth>(() =>
    getMasterPageWidthPreference(),
  );

  useBodyScrollLock(sidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen, closeSidebar]);

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

  const location = useLocation();
  const composition = resolveWorkspaceComposition(location.pathname);
  const workspaceContainerClasses = shellClassesForComposition(
    composition,
    pageWidthContainerClasses(pageWidth),
  );
  const workspaceChrome = useWorkspaceChrome(composition.id);
  const railVisible = workspaceChrome.rail != null;

  return (
    <div
      className="campaign-theme-shell flex min-h-screen flex-col"
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : undefined}
    >
      <CampaignThemeBridge />
      <InviteJoinBridge />
      <SystemAnnouncementBanner />
      <AppHeader />
      <div className={`${CANVAS_ATMOSPHERE_AMBIENT_CLASS} flex min-h-0 flex-1`}>
        <div className="hidden min-h-0 shrink-0 self-stretch lg:flex">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close campaign menu"
              onClick={closeSidebar}
              className="absolute inset-0 bg-black/60"
            />
            <div className="absolute inset-y-0 left-0 flex shadow-2xl">
              <Sidebar onNavigate={closeSidebar} onClose={closeSidebar} />
            </div>
          </div>
        )}

        <div className={`${WORKSPACE_SURFACE_CLASS} min-w-0 flex-1 overflow-y-auto overflow-x-hidden`}>
          <div className={workspaceContainerClasses}>
            <WorkspaceRail config={workspaceChrome.rail} />
            <WorkspaceContextStrip config={workspaceChrome.strip} />
            <div
              className="workspace-gutter"
              data-workspace-rail={railVisible ? 'true' : undefined}
            >
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/**
 * Campaign shell: persistent sidebar at lg+; off-canvas drawer below lg.
 */
export function CampaignLayout() {
  return (
    <WikiProvider>
      <CampaignNavProvider>
        <PluginRuntimeProvider>
          <SceneCompositionProvider>
            <AdventureWorkspaceProvider>
              <CampaignLayoutShell />
            </AdventureWorkspaceProvider>
          </SceneCompositionProvider>
        </PluginRuntimeProvider>
      </CampaignNavProvider>
    </WikiProvider>
  );
}
