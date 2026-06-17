import { useCallback, useEffect, useState } from 'react';
import { fetchVersionCheck, type VersionCheckResult } from '@/lib/systemUpdate';

const CACHE_TTL_MS = 60 * 60 * 1000;

let cached: { result: VersionCheckResult; fetchedAt: number } | null = null;
let inflight: Promise<VersionCheckResult> | null = null;

export function clearVersionCheckCacheForTests(): void {
  cached = null;
  inflight = null;
}

export function useVersionCheck() {
  const [result, setResult] = useState<VersionCheckResult | null>(
    () => cached?.result ?? null,
  );
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (
      !force &&
      cached &&
      Date.now() - cached.fetchedAt < CACHE_TTL_MS
    ) {
      setResult(cached.result);
      setLoading(false);
      setError(null);
      return cached.result;
    }

    if (!force && inflight) {
      setLoading(true);
      try {
        const data = await inflight;
        setResult(data);
        setError(null);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to check for updates.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    setError(null);

    const request = fetchVersionCheck()
      .then((data) => {
        cached = { result: data, fetchedAt: Date.now() };
        setResult(data);
        return data;
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Unable to check for updates.';
        setError(message);
        throw err;
      })
      .finally(() => {
        setLoading(false);
        inflight = null;
      });

    inflight = request;
    return request;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    result,
    loading,
    error,
    isUpdateAvailable: result?.isUpdateAvailable ?? false,
    latestVersion: result?.latestVersion ?? null,
    refresh: () => load(true),
  };
}
