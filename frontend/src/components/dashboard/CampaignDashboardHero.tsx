import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  LayoutGrid,
  Lock,
  MoreHorizontal,
  Palette,
  UserPlus,
} from 'lucide-react';
import type { CampaignDetail } from '@/types/campaign';
import type { DashboardHeroConfig } from '@/lib/dashboardConfig';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import {
  buildHeroArtOverlayStyle,
  buildHeroCoverStyle,
  getHeroLayoutClasses,
} from '@/lib/dashboardHeroPresentation';
import { useCampaignInviteLink } from '@/hooks/useCampaignInviteLink';
import { CampaignPresentationSheet } from './CampaignPresentationSheet';
import {
  environmentalHeroClass,
  TYPE_DISPLAY_CLASS,
  TYPE_META_CLASS,
  TYPE_PROSE_CLASS,
} from '@/lib/surfaceLayout';

interface CampaignDashboardHeroProps {
  /** When true, omits outer focal surface — parent owns the workspace field */
  embedded?: boolean;
  campaignHandle: string;
  campaign: CampaignDetail;
  campaignName: string;
  fallbackDescription: string | null;
  hero: DashboardHeroConfig;
  statusStrip: DashboardSummary['statusStrip'];
  canManage: boolean;
  customizeMode: boolean;
  layoutSaving: boolean;
  onCustomizeModeChange: (next: boolean) => void;
  onHeroChange: (hero: DashboardHeroConfig) => void;
}

export function CampaignDashboardHero({
  embedded = false,
  campaignHandle,
  campaign,
  campaignName,
  fallbackDescription,
  hero,
  statusStrip,
  canManage,
  customizeMode,
  layoutSaving,
  onCustomizeModeChange,
  onHeroChange,
}: CampaignDashboardHeroProps) {
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const tagline = hero.summary?.trim() || fallbackDescription || '';
  const layout = getHeroLayoutClasses(hero);
  const coverStyle = buildHeroCoverStyle(hero);
  const artOverlayStyle = hero.coverImageUrl ? buildHeroArtOverlayStyle(hero) : undefined;

  const invite = useCampaignInviteLink(campaignHandle, { enabled: canManage });

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  return (
    <>
      <section
        className={`relative flex flex-col overflow-hidden ${layout.section} ${environmentalHeroClass(Boolean(coverStyle))} ${
          embedded
            ? ''
            : `wiki-focal-region wiki-focal-region--canvas`
        }`}
      >
        {coverStyle ? (
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background: `radial-gradient(ellipse 90% 70% at 50% 30%, rgb(var(--color-atmosphere-glow-rgb) / var(--atmosphere-glow-alpha-dramatic, 0.19)), transparent 62%)`,
            }}
          />
        ) : null}
        {coverStyle ? (
          <div className="absolute inset-0" style={coverStyle} aria-hidden />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-t from-depth-3/70 via-depth-2/25 to-transparent"
          aria-hidden
        />
        {artOverlayStyle ? (
          <div className="absolute inset-0" style={artOverlayStyle} aria-hidden />
        ) : null}

        {canManage ? (
          <div className="relative flex justify-end px-4 pt-4 sm:px-6">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className={`relative inline-flex items-center justify-center gap-1.5 rounded-md border border-border/20 bg-depth-3/50 p-2 text-focal-foreground backdrop-blur-sm hover:bg-depth-3/70 ${
                  customizeMode ? 'ring-1 ring-primary/40' : ''
                }`}
                aria-label="Campaign actions"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="size-4" />
                {layoutSaving ? (
                  <span
                    className="absolute right-1 top-1 size-1.5 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-border bg-background py-1 shadow-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-elevated"
                    onClick={() => {
                      setMenuOpen(false);
                      setPresentationOpen(true);
                    }}
                  >
                    <Palette className="size-4 shrink-0 text-muted" />
                    Edit presentation
                  </button>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevated ${
                      customizeMode ? 'text-primary' : 'text-foreground'
                    }`}
                    onClick={() => {
                      setMenuOpen(false);
                      onCustomizeModeChange(!customizeMode);
                    }}
                  >
                    {customizeMode ? (
                      <Lock className="size-4 shrink-0" />
                    ) : (
                      <LayoutGrid className="size-4 shrink-0 text-muted" />
                    )}
                    {customizeMode ? 'Lock layout' : 'Customize layout'}
                    {layoutSaving ? (
                      <span className="ml-auto text-xs text-muted">Saving…</span>
                    ) : null}
                  </button>
                  <div className="my-1 border-t border-border" role="separator" />
                  <button
                    type="button"
                    disabled={!invite.inviteUrl || invite.loading}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-elevated disabled:opacity-50"
                    onClick={() => {
                      setMenuOpen(false);
                      void invite.copyInviteUrl();
                    }}
                  >
                    <UserPlus className="size-4 shrink-0 text-muted" />
                    {invite.copiedInvite ? 'Invite link copied' : 'Copy invite link'}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-elevated"
                    onClick={() => {
                      setMenuOpen(false);
                      void invite.copyCampaignShareUrl();
                    }}
                  >
                    <Copy className="size-4 shrink-0 text-muted" />
                    {invite.copiedShare ? 'Share link copied' : 'Copy share link'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={`relative mt-auto ${layout.content}`}>
          <div className="space-y-4">
            <p className={TYPE_META_CLASS}>{greeting}</p>
            <h1 className={`${TYPE_DISPLAY_CLASS} text-display-foreground ${layout.title}`}>
              {campaignName}
            </h1>
            {tagline ? (
              <p className={`${TYPE_PROSE_CLASS} max-w-2xl text-prose-muted ${layout.tagline}`}>{tagline}</p>
            ) : null}
            {!tagline && canManage ? (
              <button
                type="button"
                onClick={() => setPresentationOpen(true)}
                className="text-sm text-muted hover:text-primary"
              >
                Add a tagline…
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <CampaignPresentationSheet
        open={presentationOpen}
        campaignHandle={campaignHandle}
        campaign={campaign}
        hero={hero}
        statusStrip={statusStrip}
        fallbackDescription={fallbackDescription}
        onClose={() => setPresentationOpen(false)}
        onHeroChange={onHeroChange}
      />
    </>
  );
}
