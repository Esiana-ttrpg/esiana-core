import { useCallback, useEffect, useState } from 'react';
import type { CreativeDriftScanResult } from '@shared/creativeDrift';
import { AttachToThreadModal } from '@/components/creativeDrift/AttachToThreadModal';
import { CreativeDriftBucketSection } from '@/components/creativeDrift/CreativeDriftBucketSection';
import { CreativeDriftReawakenedStrip } from '@/components/creativeDrift/CreativeDriftReawakenedStrip';
import { CreativeDriftItemRow } from '@/components/creativeDrift/CreativeDriftItemRow';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchCreativeDrift } from '@/lib/creativeDrift';
import {
  UNRESOLVED_ERROR_MESSAGE,
  UNRESOLVED_LOADING_LABEL,
  formatSetAsideToggle,
  formatUnresolvedSummary,
} from '@/lib/unresolvedCopy';
import type { StoryFilterState } from '@/lib/workspacePersistence';
import {
  matchesStoryRecentFilter,
  matchesStorySearchQuery,
} from '@/components/adventure/StoryNarrativeToolbar';

interface CreativeDriftContentProps {
  campaignHandle: string;
  embedded?: boolean;
  storyFilters?: StoryFilterState;
}

export function CreativeDriftContent({
  campaignHandle,
  embedded = false,
  storyFilters,
}: CreativeDriftContentProps) {
  const [scan, setScan] = useState<CreativeDriftScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [attachEntityId, setAttachEntityId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchCreativeDrift(campaignHandle)
      .then(setScan)
      .catch(() => setError(UNRESOLVED_ERROR_MESSAGE))
      .finally(() => setLoading(false));
  }, [campaignHandle]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading && !scan) {
    return <LoadingSpinner label={UNRESOLVED_LOADING_LABEL} />;
  }

  if (error && !scan) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  const data = scan!;

  const filterFinding = (title: string, lastReferencedAt?: string | null) => {
    if (
      !matchesStorySearchQuery(storyFilters?.search, title) ||
      !matchesStoryRecentFilter(lastReferencedAt ?? undefined, storyFilters?.recent)
    ) {
      return false;
    }
    return true;
  };

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-2xl space-y-8 p-6'}>
      {!embedded ? (
        <header className="space-y-3">
          <h1 className="text-lg font-semibold text-foreground">Unresolved</h1>
          {data.summary.totalActive > 0 ? (
            <p className="text-xs text-muted">{formatUnresolvedSummary(data.summary.totalActive)}</p>
          ) : null}
        </header>
      ) : data.summary.totalActive > 0 ? (
        <p className="text-xs text-muted">{formatUnresolvedSummary(data.summary.totalActive)}</p>
      ) : null}

      <CreativeDriftReawakenedStrip campaignHandle={campaignHandle} items={data.reawakened} />

      <div className="space-y-6">
        {data.buckets.map((bucket) => {
          const filteredItems = bucket.items.filter((item) =>
            filterFinding(item.title, item.lastReferencedAt),
          );
          if (filteredItems.length === 0 && storyFilters?.search) return null;
          return (
            <CreativeDriftBucketSection
              key={bucket.bucket}
              campaignHandle={campaignHandle}
              bucket={{ ...bucket, items: filteredItems }}
              onUpdated={reload}
              onAttachToThread={setAttachEntityId}
            />
          );
        })}
      </div>

      {data.summary.acknowledgedCount > 0 ? (
        <footer className="border-t border-border/50 pt-4">
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground"
            onClick={() => setShowAcknowledged((v) => !v)}
          >
            {formatSetAsideToggle(showAcknowledged, data.summary.acknowledgedCount)}
          </button>
          {showAcknowledged ? (
            <ul className="mt-3 space-y-2">
              {data.acknowledged.map((finding) => (
                <CreativeDriftItemRow
                  key={finding.fingerprint}
                  campaignHandle={campaignHandle}
                  finding={finding}
                  onUpdated={reload}
                  onAttachToThread={setAttachEntityId}
                />
              ))}
            </ul>
          ) : null}
        </footer>
      ) : null}

      {attachEntityId ? (
        <AttachToThreadModal
          campaignHandle={campaignHandle}
          entityPageId={attachEntityId}
          onClose={() => setAttachEntityId(null)}
          onAttached={reload}
        />
      ) : null}
    </div>
  );
}
