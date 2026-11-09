import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import {
  fetchRelationsProjection,
  type RelationsProjectionParams,
  type RelationsProjectionResult,
} from '@/lib/relationsProjectionApi';

export function useRelationsProjection(params: RelationsProjectionParams | null) {
  const audience = useOptionalAdventureWorkspace();
  const previewAsPlayer = Boolean(audience?.isDMUser && audience.playerPreview);
  const [data, setData] = useState<RelationsProjectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const reload = useCallback(async () => {
    if (!params?.campaignHandle) return;
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRelationsProjection({ ...params, previewAsPlayer });
      if (generation !== generationRef.current) return;
      setData(result);
    } catch (err) {
      if (generation !== generationRef.current) return;
      setData(null);
      setError(err instanceof Error ? err.message : 'Unable to load relations');
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [params, previewAsPlayer]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void reload();
    }, 300);
    return () => {
      generationRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reload]);

  return { data, loading, error, reload };
}
