import { useEffect, useState } from 'react';
import { fetchDashboardBundle } from '@/lib/dashboard';
import { formatCampaignHeaderSubtitle } from '@/lib/campaignHeaderSubtitle';

const subtitleCache = new Map<string, string | null>();
const inflightRequests = new Map<string, Promise<string | null>>();

async function loadCampaignHeaderSubtitle(
  campaignHandle: string,
): Promise<string | null> {
  if (subtitleCache.has(campaignHandle)) {
    return subtitleCache.get(campaignHandle) ?? null;
  }

  const existing = inflightRequests.get(campaignHandle);
  if (existing) return existing;

  const request = fetchDashboardBundle(campaignHandle)
    .then((bundle) => {
      const subtitle = formatCampaignHeaderSubtitle(bundle.summary.statusStrip);
      subtitleCache.set(campaignHandle, subtitle);
      return subtitle;
    })
    .catch(() => {
      subtitleCache.set(campaignHandle, null);
      return null;
    })
    .finally(() => {
      inflightRequests.delete(campaignHandle);
    });

  inflightRequests.set(campaignHandle, request);
  return request;
}

export function useCampaignHeaderStatus(campaignHandle: string | undefined) {
  const [subtitle, setSubtitle] = useState<string | null>(() =>
    campaignHandle && subtitleCache.has(campaignHandle)
      ? (subtitleCache.get(campaignHandle) ?? null)
      : null,
  );
  const [loading, setLoading] = useState(
    () => Boolean(campaignHandle) && !subtitleCache.has(campaignHandle ?? ''),
  );

  useEffect(() => {
    if (!campaignHandle) {
      setSubtitle(null);
      setLoading(false);
      return;
    }

    if (subtitleCache.has(campaignHandle)) {
      setSubtitle(subtitleCache.get(campaignHandle) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadCampaignHeaderSubtitle(campaignHandle).then((nextSubtitle) => {
      if (cancelled) return;
      setSubtitle(nextSubtitle);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  return { subtitle, loading };
}
