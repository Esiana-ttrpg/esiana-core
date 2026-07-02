import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import {
  discoveryBadgeTone,
  formatDiscoveryGateLabel,
  formatRichDiscoveryStateLabel,
  shouldShowDiscoveryBadge,
  type DiscoveryBadgeSurface,
} from '@/lib/wikiPageHeaderMeta';

export function DiscoveryStateBadge({
  discovery,
  surface = 'browse',
  compact = false,
}: {
  discovery?: DiscoveryStateProjection | null;
  surface?: DiscoveryBadgeSurface;
  compact?: boolean;
}) {
  if (!discovery || !shouldShowDiscoveryBadge(discovery, surface)) {
    return null;
  }

  const tone = discoveryBadgeTone(discovery);
  const label = !discovery.available
    ? discovery.gatedUntil
      ? 'Locked'
      : 'Hidden'
    : formatRichDiscoveryStateLabel(discovery.state);

  return (
    <span
      className={`inline-flex shrink-0 flex-col rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone} ${
        compact ? 'leading-tight' : ''
      }`}
      title={
        discovery.gatedUntil
          ? formatDiscoveryGateLabel(discovery.gatedUntil)
          : formatRichDiscoveryStateLabel(discovery.state)
      }
    >
      <span>{label}</span>
      {!compact && discovery.gatedUntil ? (
        <span className="normal-case tracking-normal opacity-80">
          {formatDiscoveryGateLabel(discovery.gatedUntil)}
        </span>
      ) : null}
    </span>
  );
}

interface CategoryIndexDiscoveryBannerProps {
  undiscoveredCount: number;
  discoveredCount: number;
  itemLabel: string;
}

export function CategoryIndexDiscoveryBanner({
  undiscoveredCount,
  discoveredCount,
  itemLabel,
}: CategoryIndexDiscoveryBannerProps) {
  if (undiscoveredCount <= 0) return null;

  const total = discoveredCount + undiscoveredCount;

  return (
    <div
      className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm text-muted"
      role="status"
    >
      Showing {discoveredCount} of {total} {itemLabel}.{' '}
      <span className="text-foreground/80">
        {undiscoveredCount} undiscovered{' '}
        {undiscoveredCount === 1 ? 'entry' : 'entries'} not yet revealed to the party.
      </span>
    </div>
  );
}
