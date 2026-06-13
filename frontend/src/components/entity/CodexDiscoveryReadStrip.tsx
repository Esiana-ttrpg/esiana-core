import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { PartyKnowledgeResponse } from '@/lib/loreKnowledgeApi';
import {
  formatRichDiscoveryStateLabel,
  shouldShowDiscoveryBadge,
} from '@/lib/wikiPageHeaderMeta';
import { DiscoveryStateBadge } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';

interface CodexDiscoveryReadStripProps {
  discovery: DiscoveryStateProjection | null | undefined;
  partyKnowledge: PartyKnowledgeResponse | null | undefined;
  railCompact?: boolean;
  onViewDiscovery?: () => void;
}

export function CodexDiscoveryReadStrip({
  discovery,
  partyKnowledge,
  railCompact = false,
  onViewDiscovery,
}: CodexDiscoveryReadStripProps) {
  if (!discovery || !shouldShowDiscoveryBadge(discovery, 'codex')) {
    return null;
  }

  const claimCount = partyKnowledge?.claims?.length ?? 0;
  const contested = partyKnowledge?.isContested ?? false;

  return (
    <div
      className={`rounded-lg border border-border/60 bg-surface/30 space-y-2 ${
        railCompact ? 'p-2' : 'p-3'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-contextual-foreground/90">
        <DiscoveryStateBadge discovery={discovery} surface="codex" compact />
        <span>{formatRichDiscoveryStateLabel(discovery.state)}</span>
        {!discovery.available && discovery.gatedUntil ? (
          <span className="text-muted">until epoch {discovery.gatedUntil}</span>
        ) : null}
      </div>
      {claimCount > 0 ? (
        <p className="text-xs text-muted">
          {claimCount} recorded belief{claimCount === 1 ? '' : 's'}
          {contested ? ' · contested' : ''}
        </p>
      ) : (
        <p className="text-xs text-muted">Party knowledge for this entry.</p>
      )}
      {onViewDiscovery ? (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={onViewDiscovery}
        >
          View party knowledge on page →
        </button>
      ) : null}
    </div>
  );
}
