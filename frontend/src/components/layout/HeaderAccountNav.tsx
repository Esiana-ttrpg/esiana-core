import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/utils/userDisplayName';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CreateCampaignWizardHost } from '@/components/hub/CreateCampaignWizardHost';
import { PluginSlotHost } from '@/plugins/slots';
import { AccountMenu } from '@/components/layout/account-nav/AccountMenu';

interface HeaderAccountNavProps {
  showAdminLink?: boolean;
  campaignId?: string;
  campaignHandle?: string;
  /** Size notification + spacing to match UserAvatar sm (size-8). */
  alignControlsToAvatar?: boolean;
}

export function HeaderAccountNav({
  showAdminLink = false,
  campaignId,
  campaignHandle,
  alignControlsToAvatar = false,
}: HeaderAccountNavProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!profileMenuRef.current || !target) return;
      if (!profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  return (
    <>
      <nav className={`flex shrink-0 items-center ${alignControlsToAvatar ? 'gap-2' : 'gap-3'}`}>
        <PluginSlotHost
          slot="header"
          className="hidden items-center gap-2 sm:flex"
          context={{
            campaignId,
            campaignHandle,
            config: {},
          }}
        />
        {!loading && (
          <>
            {isAuthenticated ? (
              <>
                <NotificationBell alignControlsToAvatar={alignControlsToAvatar} />
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    title={user ? getUserDisplayName(user) : undefined}
                    className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                  >
                    <UserAvatar
                      name={user ? getUserDisplayName(user) : null}
                      avatarUrl={user?.avatarUrl}
                      userId={user?.id}
                      size="sm"
                    />
                  </button>
                  {profileMenuOpen && user ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-10 z-50 rounded-lg border border-border bg-surface p-1 shadow-xl"
                    >
                      <AccountMenu
                        user={user}
                        showAdminLink={showAdminLink}
                        activeCampaignId={campaignId}
                        activeCampaignHandle={campaignHandle}
                        onClose={() => setProfileMenuOpen(false)}
                        onLogout={logout}
                        onCreateCampaign={() => setCreateWizardOpen(true)}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/90 px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-primary"
              >
                <LogIn className="size-4" />
                {t('accountMenu.signIn')}
              </button>
            )}
          </>
        )}
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <CreateCampaignWizardHost
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
      />
    </>
  );
}
