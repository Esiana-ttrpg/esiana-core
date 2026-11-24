import { useEffect, useState } from 'react';
import { defaultQuestDate } from '@/lib/chronologyCalendar';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';

export function useCampaignChronologyNow(campaignHandle: string): ChronologyDateParts {
  const adventure = useOptionalAdventureWorkspace();
  const previewAsPlayer = Boolean(adventure?.isDMUser && adventure.playerPreview);
  const [campaignNow, setCampaignNow] = useState<ChronologyDateParts>(() =>
    defaultQuestDate(null),
  );

  useEffect(() => {
    let cancelled = false;
    setCampaignNow(defaultQuestDate(null));
    void fetchTimeTracking(campaignHandle, { previewAsPlayer })
      .then((bundle) => {
        if (!cancelled) setCampaignNow(defaultQuestDate(bundle));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, previewAsPlayer]);

  return campaignNow;
}

/** Stable string key for memoization */
export function chronologyDateKey(date: ChronologyDateParts): string {
  return `${date.year ?? 'n'}:${date.month ?? 'n'}:${date.day ?? 'n'}`;
}
