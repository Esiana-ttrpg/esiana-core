import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { useEffect, useState } from 'react';
import { fetchWikiLinkIndex, type WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';

export function useWikiLinkIndex(campaignHandle: string | undefined) {
  const adventure = useOptionalAdventureWorkspace();
  const previewAsPlayer = Boolean(adventure?.isDMUser && adventure.playerPreview);
  const [index, setIndex] = useState<WikiLinkIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignHandle) {
      setIndex([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchWikiLinkIndex(campaignHandle, { previewAsPlayer })
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
  }, [campaignHandle, previewAsPlayer]);

  return { index, loading };
}
