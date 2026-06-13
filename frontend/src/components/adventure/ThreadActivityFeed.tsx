import type { StoryThreadHistoryProjection } from '@shared/storyThreadHistoryProjection';
import { StoryThreadHistoryCard } from '@/components/adventure/StoryThreadHistoryCard';

interface ThreadActivityFeedProps {
  campaignHandle: string;
  data?: StoryThreadHistoryProjection;
}

/** Aggregate thread history — secondary lens inside Threads, not a route. */
export function ThreadActivityFeed({ campaignHandle, data }: ThreadActivityFeedProps) {
  const projection = data ?? { threads: [], stageCounts: {}, kindFilterOptions: [], anchorSessionId: null };
  const recent = projection.threads.filter(
    (entry) => entry.stage !== 'resolved' && entry.stage !== 'abandoned',
  );

  if (recent.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent thread activity. Foreshadowing milestones appear here as threads progress
        through sessions.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Recent foreshadowing activity across all threads — for prep and continuity review.
      </p>
      <ul className="space-y-3">
        {recent.slice(0, 20).map((entry) => (
          <li key={entry.threadPageId}>
            <StoryThreadHistoryCard campaignHandle={campaignHandle} entry={entry} />
          </li>
        ))}
      </ul>
    </div>
  );
}
