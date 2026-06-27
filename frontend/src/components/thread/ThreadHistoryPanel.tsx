import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import type { StoryThreadHistoryEntry } from '@shared/storyThreadHistoryProjection';
import { StoryThreadHistoryCard } from '@/components/adventure/StoryThreadHistoryCard';
import { fetchAdventureHub } from '@/lib/adventure';
import { parseSystemCategoryKey, SYSTEM_CATEGORY_QUESTS } from '@/lib/wikiSystemCategory';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface ThreadHistoryPanelProps {
  campaignHandle: string;
  threadPageId: string;
  isDMUser?: boolean;
}

/** Per-thread foreshadowing history on thread wiki detail pages. */
export function ThreadHistoryPanel({
  campaignHandle,
  threadPageId,
  isDMUser: isDMUserProp,
}: ThreadHistoryPanelProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { flatPages } = useWiki();
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<StoryThreadHistoryEntry | null>(null);

  const questsCategoryId = flatPages.find(
    (p) => parseSystemCategoryKey(p.metadata) === SYSTEM_CATEGORY_QUESTS,
  )?.id;

  useEffect(() => {
    if (!isDMUser || !questsCategoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAdventureHub(campaignHandle, {
      pageId: questsCategoryId,
      section: 'thread-history',
    })
      .then((payload) => {
        const match = payload.threadHistory?.threads.find(
          (thread) => thread.threadPageId === threadPageId,
        );
        setEntry(match ?? null);
      })
      .catch(() => setEntry(null))
      .finally(() => setLoading(false));
  }, [campaignHandle, isDMUser, questsCategoryId, threadPageId]);

  if (!isDMUser) return null;
  if (loading) return <LoadingSpinner label="Loading thread history…" />;
  if (!entry) return null;

  return (
    <section className="mt-6 space-y-2 border-t border-border pt-4">
      <h3 className="META_SECTION_LABEL_CLASS-foreground">
        Thread history
      </h3>
      <StoryThreadHistoryCard campaignHandle={campaignHandle} entry={entry} />
    </section>
  );
}
