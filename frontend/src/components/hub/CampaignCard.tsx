import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Users } from 'lucide-react';
import { resolveCampaignLinkHandle, campaignDashboardPath } from '@/lib/campaignPaths';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { CampaignSummary } from '@/types/campaign';
import {
  CampaignDiscoverability,
  normalizeDiscoverability,
} from '@shared/campaignPolicy/discoverability';
import {
  buildCampaignBannerStyle,
  campaignSummaryFallbackText,
  resolveCampaignSummaryText,
} from '@/lib/campaignCardPresentation';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface CampaignCardProps {
  campaign: CampaignSummary;
  badge?: string;
  priorityReason?: string | null;
  ctaLabel?: string;
  ctaHref?: string;
  variant?: 'default' | 'compact';
}

export function CampaignCard({
  campaign,
  badge,
  priorityReason,
  ctaLabel = 'Open Campaign',
  ctaHref,
  variant = 'default',
}: CampaignCardProps) {
  const slug = resolveCampaignLinkHandle(campaign);
  const href = ctaHref ?? campaignDashboardPath(slug);
  const { coverUrl, gradientStyle } = buildCampaignBannerStyle(campaign);
  const summary = resolveCampaignSummaryText(campaign);
  const bannerHeight = variant === 'compact' ? 'h-20' : 'h-24';

  return (
    <Link
      to={href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-elevated hover:shadow-lg hover:shadow-primary/10"
    >
      <div
        className={`relative shrink-0 ${bannerHeight}`}
        style={
          coverUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.65)), url(${coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : gradientStyle
        }
      >
        <div className="absolute inset-x-0 top-0 flex flex-wrap justify-end gap-1 p-2">
          {badge ? (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur-sm">
              {badge}
            </span>
          ) : null}
          {priorityReason ? (
            <span className="rounded-full border border-primary/30 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur-sm">
              {priorityReason}
            </span>
          ) : null}
          {normalizeDiscoverability(campaign.discoverability) ===
          CampaignDiscoverability.PUBLIC ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-background/70 px-2 py-0.5 text-[10px] text-muted backdrop-blur-sm">
              <Globe className="size-3" />
              Public
            </span>
          ) : normalizeDiscoverability(campaign.discoverability) ===
            CampaignDiscoverability.UNLISTED ? (
            <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] text-muted backdrop-blur-sm">
              Unlisted
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary">
          {campaign.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {campaign.gameSystemLabel ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {campaign.gameSystemLabel}
            </span>
          ) : null}
          {campaign.scheduleFrequency ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
              {campaign.scheduleFrequency}
            </span>
          ) : null}
          {campaign.currentSession != null && campaign.currentSession > 0 ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
              Session {campaign.currentSession}
            </span>
          ) : null}
        </div>

        {campaign.host ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <UserAvatar
              name={campaign.host.label}
              avatarUrl={campaign.host.avatarUrl}
              userId={campaign.host.id}
              size="sm"
            />
            <span>Hosted by</span>
            <span className="font-medium text-foreground">{campaign.host.label}</span>
          </div>
        ) : null}

        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
          {summary ?? (
            <span className="italic">{campaignSummaryFallbackText()}</span>
          )}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
          {campaign.role ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {campaign.role}
            </span>
          ) : (
            <span />
          )}
          <span>Updated {formatRelativeUpdated(campaign.updatedAt)}</span>
        </div>

        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          {ctaLabel}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
