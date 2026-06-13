import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PanelLeft } from 'lucide-react';
import { EsianaLogo } from '@/components/brand/EsianaLogo';
import { useBranding } from '@/contexts/BrandingContext';
import { useOptionalAdminNav } from '@/contexts/AdminNavContext';
import { useOptionalCampaignNav } from '@/contexts/CampaignNavContext';
import { CampaignHeader } from '@/components/layout/CampaignHeader';
import { HeaderAccountNav } from '@/components/layout/HeaderAccountNav';

export function AppHeader() {
  const { globalTitle, globalLogoUrl } = useBranding();
  const [logoError, setLogoError] = useState(false);
  const campaignNav = useOptionalCampaignNav();
  const adminNav = useOptionalAdminNav();
  useEffect(() => {
    setLogoError(false);
  }, [globalLogoUrl]);

  const showCampaignMenu = Boolean(campaignNav);
  const showAdminMenu = Boolean(adminNav);
  const isCampaignShell = showCampaignMenu && !showAdminMenu;

  if (isCampaignShell) {
    return <CampaignHeader />;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-2 px-4 sm:px-6 lg:px-8">
        {showCampaignMenu && (
          <button
            type="button"
            onClick={() => campaignNav?.toggleSidebar()}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-elevated lg:hidden"
            aria-label="Open campaign menu"
            aria-expanded={campaignNav?.sidebarOpen}
          >
            <PanelLeft className="size-5" />
          </button>
        )}
        {showAdminMenu && (
          <button
            type="button"
            onClick={() => adminNav?.toggleNav()}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-elevated md:hidden"
            aria-label="Open admin menu"
            aria-expanded={adminNav?.navOpen}
          >
            <PanelLeft className="size-5" />
          </button>
        )}
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-foreground transition-colors hover:text-primary"
        >
          {logoError ? (
            <BookOpen className="size-6 text-primary" strokeWidth={1.5} />
          ) : globalLogoUrl ? (
            <img
              src={globalLogoUrl}
              alt={globalTitle}
              className="size-6 rounded object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <EsianaLogo className="size-6 text-foreground" title={globalTitle} />
          )}
          <span className="truncate font-semibold tracking-tight">{globalTitle}</span>
        </Link>

        <div className="flex-1" />

        {!showCampaignMenu && !showAdminMenu ? (
          <Link
            to="/recruitment"
            className="hidden text-sm font-medium text-muted transition-colors hover:text-primary sm:inline"
          >
            Explore
          </Link>
        ) : null}

        <HeaderAccountNav showAdminLink={!showAdminMenu} />
      </div>
    </header>
  );
}
