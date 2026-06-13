import { useEffect, useState } from 'react';
import { fetchDowntimeHub } from '@/lib/downtime';
import type { ReputationStandingCard } from '@shared/downtimeHub';

export function useOrganizationReputationStanding(
  campaignHandle: string,
  orgPageId: string,
): {
  standing: ReputationStandingCard | null;
  loading: boolean;
} {
  const [standing, setStanding] = useState<ReputationStandingCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchDowntimeHub(campaignHandle, { section: 'reputation' })
      .then((payload) => {
        if (cancelled) return;
        const match =
          payload.reputation?.standings.find(
            (s) => s.factionPageId === orgPageId,
          ) ?? null;
        setStanding(match);
      })
      .catch(() => {
        if (!cancelled) setStanding(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, orgPageId]);

  return { standing, loading };
}
