import { useNavigate } from 'react-router-dom';
import type { ThreadHubNode } from '@/types/wiki';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { ThreadKindBadge } from '@/components/thread/ThreadKindBadge';
import { ThreadStatusBadge } from '@/components/thread/ThreadStatusBadge';
import { BrowseVisibilityIndicator } from '@/components/narrative/VisibilityTierChip';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import {
  THREAD_SIGNAL_CHIP_CLASS,
  threadSignalLabel,
} from '@/lib/threadVisualTokens';
import type { ThreadSignalId } from '@/lib/threadMetadata';

interface ThreadHubCardProps {
  campaignHandle: string;
  node: ThreadHubNode;
  showLifecycle?: boolean;
}

export function ThreadHubCard({
  campaignHandle,
  node,
  showLifecycle = false,
}: ThreadHubCardProps) {
  const navigate = useNavigate();
  const { flatPages } = useWiki();
  const isDMUser = useElevatedNarrativeView();
  const signals = (node.threadSignals ?? []) as ThreadSignalId[];

  return (
    <button
      type="button"
      onClick={() => navigate(campaignWikiPath(campaignHandle, node.id, flatPages))}
      className="region-depth-3 flex h-full w-full flex-col rounded-md p-4 text-left transition-colors hover:bg-focal-elevated"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0 flex-1 font-medium text-foreground">{node.title}</span>
        <div className="flex flex-wrap items-center gap-1">
          <ThreadStatusBadge status={node.thread.threadStatus} />
          <BrowseVisibilityIndicator
            pageVisibility={node.visibility}
            narrativeStatus={node.lifecycleState}
            showWhenElevated={isDMUser}
            compact
          />
          {showLifecycle && node.lifecycleState ? (
            <span className="rounded border border-border px-1.5 py-0.5 text-[9px] uppercase text-muted">
              {node.lifecycleState}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-2">
        <ThreadKindBadge kind={node.thread.threadKind} />
      </div>
      {signals.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {signals.map((signal) => (
            <span key={signal} className={THREAD_SIGNAL_CHIP_CLASS}>
              {threadSignalLabel(signal)}
            </span>
          ))}
        </div>
      ) : null}
      {node.snippet ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted">{node.snippet}</p>
      ) : null}
      {node.references.related.length > 0 ? (
        <p className="mt-2 text-[10px] text-muted">
          {node.references.related.length} linked page
          {node.references.related.length === 1 ? '' : 's'}
        </p>
      ) : null}
    </button>
  );
}
