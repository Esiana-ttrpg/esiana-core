import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, Loader2 } from 'lucide-react';
import type { AdventureHubPayload } from '@/lib/adventure';
import { CampaignFeedView } from '@/components/chronology/CampaignFeedView';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import { useChronologyOverlayFeed } from '@/lib/useChronologyOverlayFeed';

interface TimelineSectionProps {
  campaignHandle: string;
  data: AdventureHubPayload['timeline'];
}

export function TimelineSection({ campaignHandle, data }: TimelineSectionProps) {
  const [selectedDomains, setSelectedDomains] = useState<string[]>(
    () => data?.defaultDomains ?? [],
  );
  const [sessionLinkedOnly, setSessionLinkedOnly] = useState(false);

  const { bundle, refetching, error } = useChronologyOverlayFeed(campaignHandle, {
    initialBundle: data?.overlay ?? null,
    selectedDomains,
    sessionLinkedOnly,
  });

  const chronologyHref = data?.chronologyPath ?? campaignChronologyPath(campaignHandle, 'feed');
  const visibleCount = bundle?.entries.filter((e) => e.projection.visible).length ?? 0;

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading timeline…</p>;
  }

  return (
    <div className="flex min-h-[480px] w-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Aggregated chronology — edit events in Chronology Hub.
          </p>
        </div>
        <Link
          to={chronologyHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Calendar className="size-3.5 text-primary" />
          Open Chronology Hub
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {refetching ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Refreshing timeline…
        </p>
      ) : null}

      {bundle ? (
        <div className="flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
          {visibleCount === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              <p>No chronology entries match the current filters.</p>
              <p className="mt-2">
                World and session events appear here once calendar data exists.{' '}
                <Link to={chronologyHref} className="text-primary hover:underline">
                  Open Chronology Hub
                </Link>{' '}
                to add events.
              </p>
            </div>
          ) : (
            <CampaignFeedView
              bundle={bundle}
              selectedDomains={selectedDomains}
              sessionLinkedOnly={sessionLinkedOnly}
              onDomainsChange={setSelectedDomains}
              onSessionLinkedOnlyChange={setSessionLinkedOnly}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Timeline overlay unavailable.{' '}
          <Link to={chronologyHref} className="text-primary hover:underline">
            Open Chronology Hub
          </Link>
        </p>
      )}
    </div>
  );
}
