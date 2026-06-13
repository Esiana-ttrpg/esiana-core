import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRelationsProjection,
  type RelationsProjectionParams,
  type RelationsProjectionResult,
} from '@/lib/relationsProjectionApi';

export function useRelationsProjection(params: RelationsProjectionParams | null) {
  const [data, setData] = useState<RelationsProjectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!params?.campaignHandle) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRelationsProjection(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load relations');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void reload();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reload]);

  return { data, loading, error, reload };
}
