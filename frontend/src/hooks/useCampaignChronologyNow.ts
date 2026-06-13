import { useEffect, useState } from 'react';
import { defaultQuestDate } from '@/lib/chronologyCalendar';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';

export function useCampaignChronologyNow(campaignHandle: string): ChronologyDateParts {
  const [campaignNow, setCampaignNow] = useState<ChronologyDateParts>(() =>
    defaultQuestDate(null),
  );

  useEffect(() => {
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (!cancelled) setCampaignNow(defaultQuestDate(bundle));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  return campaignNow;
}

/** Stable string key for memoization */
export function chronologyDateKey(date: ChronologyDateParts): string {
  return `${date.year ?? 'n'}:${date.month ?? 'n'}:${date.day ?? 'n'}`;
}
