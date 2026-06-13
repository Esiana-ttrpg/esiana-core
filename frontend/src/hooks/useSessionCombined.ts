import { useCallback, useEffect, useState } from 'react';
import { fetchCombinedSessionNotes } from '@/lib/wiki';
import type { CombinedSessionNotesPayload } from '@/types/wiki';

export interface UseSessionCombinedParams {
  timelinePointId?: string;
  sessionGroupId?: string;
  pageId?: string;
}

export function useSessionCombined(
  campaignHandle: string,
  params: UseSessionCombinedParams,
) {
  const [data, setData] = useState<CombinedSessionNotesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryKey = [
    campaignHandle,
    params.timelinePointId ?? '',
    params.sessionGroupId ?? '',
    params.pageId ?? '',
  ].join('|');

  const refetch = useCallback(async () => {
    if (!campaignHandle) return;
    if (!params.timelinePointId && !params.sessionGroupId && !params.pageId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await fetchCombinedSessionNotes(campaignHandle, params);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, params.timelinePointId, params.sessionGroupId, params.pageId]);

  useEffect(() => {
    void refetch();
  }, [refetch, queryKey]);

  return { data, loading, error, refetch };
}
