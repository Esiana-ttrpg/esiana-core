import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { fetchFactionGossip } from '@/lib/rumorEngineApi';
import type { RumorFeedProjection } from '@/types/rumorEngine';

type FactionGossipSectionProps = {
  campaignHandle: string;
  orgPageId: string;
};

export function FactionGossipSection({
  campaignHandle,
  orgPageId,
}: FactionGossipSectionProps) {
  const [feed, setFeed] = useState<RumorFeedProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFactionGossip(campaignHandle, orgPageId);
      setFeed(result.feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gossip');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, orgPageId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-lg border border-border/60 bg-muted/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted" aria-hidden />
        <h3 className="text-sm font-medium">Faction gossip</h3>
      </div>

      {loading && !feed ? <p className="text-xs text-muted">Loading…</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {feed && feed.items.length === 0 ? (
        <p className="text-xs text-muted">No gossip tied to this faction.</p>
      ) : null}

      {feed?.items.map((item) => (
        <div
          key={item.claim.id}
          className="rounded border border-border/50 px-2 py-1.5 text-sm space-y-1"
        >
          <p className="leading-snug">{item.claim.statement}</p>
          <p className="text-xs text-muted">
            {item.stance}
            {item.lastCirculatedAt ? ` · ${item.lastCirculatedAt}` : ''}
          </p>
        </div>
      ))}

      {feed?.contradictionBundles?.map((bundle, i) =>
        bundle.isContested ? (
          <div
            key={bundle.groupId ?? `fc-${i}`}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs"
          >
            <p className="font-medium text-amber-800 dark:text-amber-200">Contested</p>
            <ul className="list-disc pl-4 mt-1">
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
