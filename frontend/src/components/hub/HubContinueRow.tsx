import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ContinueCandidate } from '@/lib/hubPrioritization';
import type { HubContinueEntityItem } from '@/types/hub';
import {
  buildCampaignBannerStyle,
  campaignSummaryFallbackText,
  resolveCampaignSummaryText,
} from '@/lib/campaignCardPresentation';
import { formatRelativeUpdated } from '@/utils/formatDate';

interface HubContinueRowProps {
  candidates: ContinueCandidate[];
  /** Phase 3: entity-level continue items merged across campaigns. */
  entityFeed?: HubContinueEntityItem[];
}

function ContinueSpotlightCard({ candidate }: { candidate: ContinueCandidate }) {
  const { campaign, reason, ctaLabel, ctaHref } = candidate;
  const { coverUrl, gradientStyle } = buildCampaignBannerStyle(campaign);
  const summary = resolveCampaignSummaryText(campaign);

  return (
    <Link
      to={ctaHref}
      className="group flex min-w-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-primary/25 bg-surface shadow-md transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15 sm:min-w-0"
    >
      <div
        className="relative h-32 shrink-0"
        style={
          coverUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.7)), url(${coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : gradientStyle
        }
      >
        <span className="absolute left-3 top-3 rounded-full border border-primary/40 bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold text-primary backdrop-blur-sm">
          {reason}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
          {campaign.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">
          {summary ?? campaignSummaryFallbackText()}
        </p>
        <p className="mt-2 text-xs text-muted">
          Updated {formatRelativeUpdated(campaign.updatedAt)}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-primary">
          {ctaLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function ContinueEntityItem({ item }: { item: HubContinueEntityItem }) {
  return (
    <Link
      to={item.href}
      className="group flex items-start gap-3 rounded-lg border border-border/80 bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-elevated/60"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {item.campaignName}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground group-hover:text-primary">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-primary/90">{item.reason}</p>
      </div>
      {item.updatedAt ? (
        <span className="shrink-0 text-[10px] text-muted">
          {formatRelativeUpdated(item.updatedAt)}
        </span>
      ) : null}
    </Link>
  );
}

export function HubContinueRow({ candidates, entityFeed = [] }: HubContinueRowProps) {
  if (candidates.length === 0 && entityFeed.length === 0) return null;

  const showEntityFeed = entityFeed.length > 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Continue</h2>
        <p className="text-sm text-muted">Pick up where your stories left off.</p>
      </div>

      {showEntityFeed ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entityFeed.map((item) => (
            <li key={`${item.campaignId}-${item.entityType}-${item.entityId}`}>
              <ContinueEntityItem item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={
            candidates.length === 1
              ? 'grid gap-4'
              : 'flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible'
          }
        >
          {candidates.map((candidate) => (
            <ContinueSpotlightCard key={candidate.campaign.id} candidate={candidate} />
          ))}
        </div>
      )}
    </section>
  );
}
