import { useEffect, useState } from 'react';
import { fetchAdminSampleDataStatus } from '@/lib/sampleData';

export function useAdminSampleDataEnabled(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const status = await fetchAdminSampleDataStatus();
        if (!cancelled) setEnabled(status.enabled);
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}
