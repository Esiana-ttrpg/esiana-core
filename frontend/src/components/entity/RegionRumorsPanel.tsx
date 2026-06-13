import { useCallback, useEffect, useState } from 'react';
import { MessageCircleWarning } from 'lucide-react';
import { fetchLocationRumors } from '@/lib/rumorEngineApi';
import type { RumorFeedProjection } from '@/types/rumorEngine';
import { useWiki } from '@/contexts/WikiContext';

type RegionRumorsPanelProps = {
  campaignHandle: string;
  locationPageId: string;
};

export function RegionRumorsPanel({
  campaignHandle,
  locationPageId,
}: RegionRumorsPanelProps) {
  const { hasElevatedView } = useWiki();
  const isDm = hasElevatedView;
  const [feed, setFeed] = useState<RumorFeedProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLocationRumors(campaignHandle, locationPageId);
      setFeed(result.feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rumors');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, locationPageId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-lg border border-border/60 bg-muted/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <MessageCircleWarning className="size-4 text-muted" aria-hidden />
        <h3 className="text-sm font-medium">Regional rumors</h3>
      </div>

      {loading && !feed ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {feed && feed.items.length === 0 ? (
        <p className="text-xs text-muted">No rumors circulating in this region.</p>
      ) : null}

      {feed?.items.map((item) => (
        <div
          key={item.claim.id}
          className="rounded border border-border/50 px-2 py-1.5 text-sm space-y-1"
        >
          <p className="leading-snug">{item.claim.statement}</p>
          <p className="text-xs text-muted">
            {item.stance}
            {item.lastCirculatedAt ? ` · last heard ${item.lastCirculatedAt}` : ''}
            {isDm && item.primaryInclusionReason
              ? ` · ${item.primaryInclusionReason.code}`
              : ''}
          </p>
        </div>
      ))}

      {feed?.contradictionBundles?.map((bundle, i) =>
        bundle.isContested ? (
          <div
            key={bundle.groupId ?? `contested-${i}`}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs space-y-1"
          >
            <p className="font-medium text-amber-800 dark:text-amber-200">Contested accounts</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {bundle.perspectives.map((p) => (
                <li key={`${p.scopeKind}-${p.scopeRef}`}>{p.summary}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}
