import { useEffect, useRef, useState } from 'react';
import type { ConvergenceOverlayBundle } from '@/types/chronologyOverlay';
import { fetchChronologyOverlay } from '@/lib/chronologyOverlayApi';

export type UseChronologyOverlayFeedOptions = {
  initialBundle?: ConvergenceOverlayBundle | null;
  selectedDomains: string[];
  sessionLinkedOnly: boolean;
  windowMode?: string;
  from?: string;
  to?: string;
};

export function useChronologyOverlayFeed(
  campaignHandle: string,
  options: UseChronologyOverlayFeedOptions,
) {
  const {
    initialBundle = null,
    selectedDomains,
    sessionLinkedOnly,
    windowMode = 'YEAR_RANGE',
    from = '0',
    to = '9999',
  } = options;

  const [bundle, setBundle] = useState<ConvergenceOverlayBundle | null>(initialBundle);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipNextRefetchRef = useRef(Boolean(initialBundle));

  useEffect(() => {
    setBundle(initialBundle ?? null);
    skipNextRefetchRef.current = Boolean(initialBundle);
  }, [initialBundle]);

  const domainsKey = selectedDomains.join(',');

  useEffect(() => {
    if (!campaignHandle) return;

    if (skipNextRefetchRef.current) {
      skipNextRefetchRef.current = false;
      return;
    }

    let cancelled = false;
    setRefetching(true);
    setError(null);

    void fetchChronologyOverlay(campaignHandle, {
      windowMode,
      from,
      to,
      domains: domainsKey.length > 0 ? domainsKey : undefined,
      sessionLinkedOnly,
    })
      .then((data) => {
        if (!cancelled) setBundle(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load timeline overlay');
        }
      })
      .finally(() => {
        if (!cancelled) setRefetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, domainsKey, sessionLinkedOnly, windowMode, from, to]);

  return { bundle, refetching, error };
}
