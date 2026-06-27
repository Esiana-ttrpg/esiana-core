import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Palette, X } from 'lucide-react';
import type { CampaignDetail } from '@/types/campaign';
import {
  CampaignDiscoverability,
  normalizeDiscoverability,
} from '@shared/campaignPolicy/discoverability';
import type { DashboardHeroConfig } from '@/lib/dashboardConfig';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import { campaignSettingsPath } from '@/lib/campaignPaths';
import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';
import {
  HERO_MODE_META,
  HERO_MODES,
  buildHeroArtOverlayStyle,
  buildHeroPreviewFrameStyle,
  defaultOverlayStrength,
  type HeroMode,
} from '@/lib/dashboardHeroPresentation';

interface CampaignPresentationSheetProps {
  open: boolean;
  campaignHandle: string;
  campaign: CampaignDetail;
  hero: DashboardHeroConfig;
  statusStrip: DashboardSummary['statusStrip'];
  fallbackDescription: string | null;
  onClose: () => void;
  onHeroChange: (hero: DashboardHeroConfig) => void;
}

export function CampaignPresentationSheet({
  open,
  campaignHandle,
  campaign,
  hero,
  statusStrip,
  fallbackDescription,
  onClose,
  onHeroChange,
}: CampaignPresentationSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!open) return null;

  function selectHeroMode(mode: HeroMode) {
    onHeroChange({
      ...hero,
      heroMode: mode,
      overlayStrength: defaultOverlayStrength(mode),
    });
  }

  const visibilityLabel = (() => {
    switch (normalizeDiscoverability(campaign.discoverability)) {
      case CampaignDiscoverability.PUBLIC:
        return 'Public';
      case CampaignDiscoverability.UNLISTED:
        return 'Unlisted';
      default:
        return 'Private';
    }
  })();
  const recruitmentLabel =
    statusStrip.recruitmentLabel ??
    (campaign.isLookingForGroup ? 'Recruitment open' : 'Recruitment paused');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close presentation editor"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="campaign-presentation-title"
        className="relative flex h-full w-full max-w-md flex-col border-border bg-background shadow-2xl sm:my-auto sm:max-h-[90vh] sm:rounded-2xl sm:border"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2
              id="campaign-presentation-title"
              className={TYPE_DISPLAY_CLASS}
            >
              Campaign Presentation
            </h2>
            <p className="mt-1 text-sm text-muted">
              Set how your campaign introduces itself to members and visitors.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Banner display</h3>
            <p className="text-xs text-muted">
              Choose how much vertical space the banner uses on Campaign home.
            </p>
            <div className="grid gap-2">
              {HERO_MODES.map((mode) => {
                const meta = HERO_MODE_META[mode];
                const selected = hero.heroMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => selectHeroMode(mode)}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-elevated hover:border-primary/40'
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{meta.description}</span>
                  </button>
                );
              })}
            </div>
            <div
              className="relative overflow-hidden rounded-xl border border-border"
              style={buildHeroPreviewFrameStyle(hero)}
            >
              {hero.coverImageUrl ? (
                <div
                  className="absolute inset-0"
                  style={buildHeroArtOverlayStyle(hero)}
                  aria-hidden
                />
              ) : null}
              <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-4">
                <p className="text-sm font-semibold text-foreground">Preview</p>
                <p className="text-xs text-foreground/80">
                  {HERO_MODE_META[hero.heroMode].label} layout
                </p>
              </div>
            </div>
            <p className="text-xs text-muted">
              Reposition banner (focal point) — coming soon. Art is centered by default.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Banner image</h3>
            <ImportImageUrlField
              campaignHandle={campaignHandle}
              value={hero.coverImageUrl ?? ''}
              uploadType="campaign-cover"
              onChange={(referenceUrl) =>
                onHeroChange({ ...hero, coverImageUrl: referenceUrl || null })
              }
            />
            {hero.coverImageUrl ? (
              <button
                type="button"
                onClick={() => onHeroChange({ ...hero, coverImageUrl: null })}
                className="h-9 rounded-lg border border-border px-3 text-sm text-muted hover:bg-elevated hover:text-foreground"
              >
                Remove banner
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
            >
              {showAdvanced ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              Advanced
            </button>
            {showAdvanced ? (
              <div className="space-y-3 rounded-lg border border-border bg-elevated/40 p-3">
                <label className="block text-xs font-medium text-muted">
                  Overlay strength ({Math.round(hero.overlayStrength * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(hero.overlayStrength * 100)}
                  onChange={(event) =>
                    onHeroChange({
                      ...hero,
                      overlayStrength: Number(event.target.value) / 100,
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted">
                  Darkens the gradient over banner art so title and tagline stay readable.
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-2">
            <label
              htmlFor="campaign-tagline"
              className="text-sm font-semibold text-foreground"
            >
              Tagline
            </label>
            <textarea
              id="campaign-tagline"
              value={hero.summary ?? ''}
              placeholder={
                fallbackDescription ?? 'A short line that sets the tone for your table…'
              }
              onChange={(event) =>
                onHeroChange({ ...hero, summary: event.target.value || null })
              }
              rows={4}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Campaign status</h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-elevated px-3 py-1 text-xs text-foreground">
                {visibilityLabel}
              </span>
              <span className="rounded-full border border-border bg-elevated px-3 py-1 text-xs text-foreground">
                {recruitmentLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                to={campaignSettingsPath(campaignHandle, 'general')}
                className="text-primary hover:underline"
                onClick={onClose}
              >
                General settings
              </Link>
              <Link
                to={campaignSettingsPath(campaignHandle, 'recruitment')}
                className="text-primary hover:underline"
                onClick={onClose}
              >
                Recruitment
              </Link>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Theme & colors</h3>
            <p className="text-sm text-muted">
              Accent colors and typography are managed separately from banner and tagline.
            </p>
            <Link
              to={campaignSettingsPath(campaignHandle, 'appearance')}
              onClick={onClose}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-sm font-medium text-foreground hover:bg-surface"
            >
              <Palette className="size-4 text-primary" />
              Open theme settings
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
