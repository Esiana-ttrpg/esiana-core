import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMyCampaigns } from '@/lib/campaigns';
import {
  campaignDashboardPath,
  resolveCampaignLinkHandle,
} from '@/lib/campaignPaths';
import { sortCampaignsByName } from '@/lib/sortCampaignsByName';
import type { CampaignSummary } from '@/types/campaign';

const chevronControlClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[rgb(var(--color-focal-rgb)/0.06)]';

interface CampaignPickerProps {
  campaignHandle: string;
  campaignId?: string;
  campaignName: string | null;
}

export function CampaignPicker({
  campaignHandle,
  campaignId,
  campaignName,
}: CampaignPickerProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    setLoadError(null);
    try {
      const data = await fetchMyCampaigns();
      setCampaigns(sortCampaignsByName(data.filter((c) => c.isMember)));
      setHasLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load campaigns.');
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    if (!menuOpen || hasLoaded) return;
    void loadCampaigns();
  }, [menuOpen, hasLoaded, loadCampaigns]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) return;
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  function isActiveCampaign(campaign: CampaignSummary): boolean {
    if (campaignId && campaign.id === campaignId) return true;
    const slug = resolveCampaignLinkHandle(campaign);
    return slug === campaignHandle;
  }

  function selectCampaign(campaign: CampaignSummary) {
    const slug = resolveCampaignLinkHandle(campaign);
    setMenuOpen(false);
    navigate(campaignDashboardPath(slug));
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-0.5" ref={menuRef}>
      {campaignName ? (
        <Link
          to={campaignDashboardPath(campaignHandle)}
          className="min-w-0 truncate text-lg font-semibold leading-tight whitespace-nowrap transition-colors hover:text-primary sm:text-xl"
          title={campaignName}
        >
          {campaignName}
        </Link>
      ) : (
        <span className="inline-block h-5 w-28 animate-pulse rounded bg-elevated" />
      )}

      <button
        type="button"
        className={chevronControlClass}
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Switch campaign"
        disabled={!campaignName}
      >
        <ChevronDown className="size-4" />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-50 min-w-52 max-w-[min(18rem,85vw)] rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          {loadingCampaigns ? (
            <p className="px-3 py-2 text-sm text-muted">Loading campaigns…</p>
          ) : loadError ? (
            <p className="px-3 py-2 text-sm text-red-300">{loadError}</p>
          ) : campaigns.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No campaigns found.</p>
          ) : (
            campaigns.map((campaign) => {
              const active = isActiveCampaign(campaign);
              return (
                <button
                  key={campaign.id}
                  type="button"
                  role="menuitem"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => selectCampaign(campaign)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-elevated ${
                    active ? 'bg-elevated/60 text-foreground' : 'text-foreground'
                  }`}
                >
                  <Check
                    className={`size-4 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{campaign.name}</span>
                </button>
              );
            })
          )}

          <div className="my-1 border-t border-border/40" />

          <Link
            to="/campaigns"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            Your Campaigns
          </Link>
        </div>
      ) : null}
    </div>
  );
}
