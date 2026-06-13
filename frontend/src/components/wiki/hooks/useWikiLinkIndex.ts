import { useEffect, useState } from 'react';
import { fetchWikiLinkIndex, type WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';

export function useWikiLinkIndex(campaignHandle: string | undefined) {
  const [index, setIndex] = useState<WikiLinkIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignHandle) {
      setIndex([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchWikiLinkIndex(campaignHandle)
      .then((entries) => {
        if (!cancelled) setIndex(entries);
      })
      .catch(() => {
        if (!cancelled) setIndex([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  return { index, loading };
}
