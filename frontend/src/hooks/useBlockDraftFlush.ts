import { useCallback, useRef } from 'react';

/**
 * Stable flush callback for PageBlockDraftRegistry — keeps latest flush impl without re-register churn.
 */
export function useBlockDraftFlush(flush: () => Promise<void>): () => Promise<void> {
  const flushRef = useRef(flush);
  flushRef.current = flush;
  return useCallback(() => flushRef.current(), []);
}
