import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRoles } from '@/types/domain';
import { getUserDisplayName } from '@/utils/userDisplayName';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PluginSlotHost } from '@/plugins/slots';

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
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
                  {profileMenuOpen && (
                    <div
                      role="menu"
                      className={`absolute right-0 top-10 z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-xl`}
                    >
                      <Link
                        to={`/users/${user?.id ?? 'me'}`}
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-elevated"
                      >
                        User Profile
                      </Link>
                      <Link
                        to="/campaigns"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-elevated"
                      >
                        Your Campaigns
                      </Link>
                      <Link
                        to="/settings"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-elevated"
                      >
                        User Settings
                      </Link>
                      {showAdminLink && user?.role === UserRoles.SYSTEM_ADMIN ? (
                        <Link
                          to="/admin/settings/general"
                          role="menuitem"
                          onClick={() => setProfileMenuOpen(false)}
                          className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-elevated"
                        >
                          Admin
                        </Link>
                      ) : null}
                      <div className="my-1 border-t border-border" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-elevated"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/90 px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-primary"
              >
                <LogIn className="size-4" />
                Sign in
              </button>
            )}
          </>
        )}
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
