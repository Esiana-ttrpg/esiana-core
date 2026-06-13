import { useCallback, useEffect, useState } from 'react';
import {
  resolveLoreSemanticBundleFromSettled,
  resolveLoreSemanticBundleStatus,
  sliceErrorMessage,
  type LoreSemanticBundle,
  type LoreSemanticBundleErrors,
  type LoreSemanticBundleStatus,
} from '@/lib/loreSemanticBundle';
import {
  fetchHistoricalAliases,
  fetchInterpretationsBundle,
  fetchLoreClaims,
} from '@/lib/loreKnowledgeApi';

export type { LoreSemanticBundle, LoreSemanticBundleErrors, LoreSemanticBundleStatus };

export type LoreSemanticBundleState = {
  status: LoreSemanticBundleStatus;
  bundle: LoreSemanticBundle | null;
  errors: LoreSemanticBundleErrors;
  refetch: () => void;
};

async function loadLoreSemanticBundle(
  campaignHandle: string,
  pageId: string,
): Promise<{
  bundle: LoreSemanticBundle;
  errors: LoreSemanticBundleErrors;
  status: 'empty' | 'ready';
}> {
  const [aliasesResult, interpretationsResult, claimsResult] =
    await Promise.allSettled([
      fetchHistoricalAliases(campaignHandle, pageId),
      fetchInterpretationsBundle(campaignHandle, pageId),
      fetchLoreClaims(campaignHandle, pageId),
    ]);

  const { bundle, errors } = resolveLoreSemanticBundleFromSettled({
    aliases:
      aliasesResult.status === 'fulfilled'
        ? { ok: true, value: aliasesResult.value }
        : { ok: false, error: sliceErrorMessage(aliasesResult.reason) },
    interpretations:
      interpretationsResult.status === 'fulfilled'
        ? { ok: true, value: interpretationsResult.value }
        : {
            ok: false,
            error: sliceErrorMessage(interpretationsResult.reason),
          },
    claims:
      claimsResult.status === 'fulfilled'
        ? { ok: true, value: claimsResult.value }
        : { ok: false, error: sliceErrorMessage(claimsResult.reason) },
  });

  return {
    bundle,
    errors,
    status: resolveLoreSemanticBundleStatus(bundle, errors),
  };
}

export function useLoreSemanticBundle(
  campaignHandle: string,
  pageId: string,
): LoreSemanticBundleState {
  const [status, setStatus] = useState<LoreSemanticBundleStatus>('idle');
  const [bundle, setBundle] = useState<LoreSemanticBundle | null>(null);
  const [errors, setErrors] = useState<LoreSemanticBundleErrors>({});
  const [fetchGeneration, setFetchGeneration] = useState(0);

  const refetch = useCallback(() => {
    setFetchGeneration((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setBundle(null);
    setErrors({});

    void loadLoreSemanticBundle(campaignHandle, pageId).then((result) => {
      if (cancelled) return;
      setBundle(result.bundle);
      setErrors(result.errors);
      setStatus(result.status);
    });

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, pageId, fetchGeneration]);

  return { status, bundle, errors, refetch };
}
