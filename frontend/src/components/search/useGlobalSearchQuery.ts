import { useEffect, useState } from 'react';
import { fetchGlobalSearch } from '@/lib/globalSearchApi';
import type { GlobalSearchResponse } from '@shared/globalSearch';

const DEBOUNCE_MS = 200;

export function useGlobalSearchQuery(
  campaignHandle: string,
  query: string,
  type: string | null,
): {
  data: GlobalSearchResponse | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed.length < 2) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchGlobalSearch(
      campaignHandle,
      { q: trimmed, type, limit: 20 },
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setData(response);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setData(null);
        setError(err instanceof Error ? err.message : 'Search failed');
      });

    return () => controller.abort();
  }, [campaignHandle, debounced, type]);

  return { data, loading, error };
}
