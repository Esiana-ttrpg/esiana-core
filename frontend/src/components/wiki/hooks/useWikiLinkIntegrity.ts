import { useEffect, useMemo, useState } from 'react';
import { fetchWikiLinkIntegrity } from '@/lib/wiki';
import type { WikiLinkIntegrityPayload } from '@/types/wiki';

export function useWikiLinkIntegrity(
  campaignHandle: string,
  pageId: string,
  enabled = true,
) {
  const [integrity, setIntegrity] = useState<WikiLinkIntegrityPayload | null>(
    null,
  );

  useEffect(() => {
    if (!enabled || !campaignHandle || !pageId) {
      setIntegrity(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWikiLinkIntegrity(campaignHandle, pageId);
        if (!cancelled) setIntegrity(data);
      } catch {
        if (!cancelled) setIntegrity({ broken: [], outboundCount: 0 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, pageId, enabled]);

  const brokenTargetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of integrity?.broken ?? []) {
      if (item.targetPageId) ids.add(item.targetPageId);
    }
    return ids;
  }, [integrity]);

  return { integrity, brokenTargetIds };
}
