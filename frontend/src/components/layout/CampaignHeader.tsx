import { Link } from 'react-router-dom';
import { Home, PanelLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { useCampaignNav } from '@/contexts/CampaignNavContext';
import { useWiki } from '@/contexts/WikiContext';
import { useCampaignHeaderStatus } from '@/hooks/useCampaignHeaderStatus';
import { CampaignSearch } from '@/components/campaign/CampaignSearch';
import { CampaignIdentityLink } from '@/components/layout/CampaignIdentityLink';
import { HeaderAccountNav } from '@/components/layout/HeaderAccountNav';

const headerControlClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[rgb(var(--color-focal-rgb)/0.06)]';

const headerRowClass = 'items-center py-1.5 px-4 sm:pr-6 lg:pr-8';

function GlobalHomeLink() {
  return (
    <Link
      to="/"
      className={headerControlClass}
      aria-label="Global home"
      title="Global home"
    >
      <Home className="size-6" strokeWidth={1.5} />
    </Link>
  );
}

function CampaignIdentityCluster({
  campaignHandle,
  campaignName,
  subtitle,
}: {
  campaignHandle: string;
  campaignName: string | null;
  subtitle: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      <div className="flex min-w-0 items-center gap-1.5">
        <GlobalHomeLink />
        <span
          className="h-5 w-px shrink-0 bg-[rgb(var(--color-border-warm-rgb)/0.2)]"
          aria-hidden
        />
        <CampaignIdentityLink
          campaignHandle={campaignHandle}
          campaignName={campaignName}
        />
      </div>
      {subtitle ? (
        <p
          className="ml-[calc(2rem+0.375rem)] mt-0.5 truncate text-[11px] leading-none opacity-70"
          aria-label="Campaign status"
          title={subtitle}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function CampaignHeader() {
  const campaignNav = useCampaignNav();
  const { campaign, campaignHandle, loading } = useWiki();
  const { subtitle } = useCampaignHeaderStatus(campaignHandle);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const campaignName = loading ? null : (campaign?.name ?? 'Campaign');

  const accountNav = (
    <HeaderAccountNav
      showAdminLink
      campaignId={campaign?.id}
      campaignHandle={campaignHandle}
      alignControlsToAvatar
    />
  );

  return (
    <header className="campaign-header-sticky sticky top-0 z-40 w-full border-b border-[rgb(var(--color-border-warm-rgb)/0.08)] bg-canvas/70 backdrop-blur-sm">
      <div className={`flex gap-3 ${headerRowClass} sm:hidden`}>
        <button
          type="button"
          onClick={() => campaignNav.toggleSidebar()}
          className={headerControlClass}
          aria-label="Open campaign menu"
          aria-expanded={campaignNav.sidebarOpen}
        >
          <PanelLeft className="size-4" />
        </button>

        <CampaignIdentityCluster
          campaignHandle={campaignHandle}
          campaignName={campaignName}
          subtitle={subtitle}
        />

        <button
          type="button"
          onClick={() => setMobileSearchOpen((open) => !open)}
          className={headerControlClass}
          aria-label={mobileSearchOpen ? 'Close campaign search' : 'Open campaign search'}
          aria-expanded={mobileSearchOpen}
        >
          <Search className="size-4" strokeWidth={1.5} />
        </button>

        {accountNav}
      </div>

      <div
        className={`hidden w-full grid-cols-[minmax(0,1fr)_min(100%,28rem)_minmax(0,1fr)] items-center gap-x-3 sm:grid ${headerRowClass}`}
      >
        <div className="flex min-w-0 max-w-[min(100%,36%)] items-center justify-self-start">
          <CampaignIdentityCluster
            campaignHandle={campaignHandle}
            campaignName={campaignName}
            subtitle={subtitle}
          />
        </div>

        <CampaignSearch
          campaignHandle={campaignHandle}
          alignControlsToAvatar
          className="w-full min-w-0 justify-self-center sm:max-w-md lg:max-w-lg"
        />

        <div className="justify-self-end">{accountNav}</div>
      </div>

      {mobileSearchOpen ? (
        <div className="border-t border-[rgb(var(--color-border-warm-rgb)/0.08)] px-3 py-1.5 sm:hidden">
          <CampaignSearch
            campaignHandle={campaignHandle}
            alignControlsToAvatar
            inputId="campaign-header-search-mobile"
            autoFocus
            onClose={() => setMobileSearchOpen(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
