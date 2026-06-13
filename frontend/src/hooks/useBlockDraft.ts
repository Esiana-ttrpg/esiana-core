import { useCallback, useEffect, useRef, useState } from 'react';

/** Whether incoming source should replace local draft (exported for tests). */
export function shouldResyncDraftFromSource(
  dirty: boolean,
  prevSerialized: string,
  nextSerialized: string,
): boolean {
  return nextSerialized !== prevSerialized && !dirty;
}

export interface UseBlockDraftOptions<T> {
  blockId: string;
  source: T;
  serialize: (value: T) => string;
}

export interface UseBlockDraftResult<T> {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  dirty: boolean;
  resetFromSource: () => void;
  markCommitted: (committed?: T) => void;
}

/**
 * Local draft for semantic block editors — avoids propagating keystrokes to WikiPage grid.
 * Commit timing (blur, debounce, immediate structural saves) is owned by the caller.
 */
export function useBlockDraft<T>({
  blockId,
  source,
  serialize,
}: UseBlockDraftOptions<T>): UseBlockDraftResult<T> {
  const [draft, setDraft] = useState<T>(source);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;
  const sourceKeyRef = useRef(serialize(source));
  const blockIdRef = useRef(blockId);

  useEffect(() => {
    if (blockIdRef.current !== blockId) {
      blockIdRef.current = blockId;
      setDraft(source);
      sourceKeyRef.current = serializeRef.current(source);
      setDirty(false);
      return;
    }
    const nextKey = serializeRef.current(source);
    if (shouldResyncDraftFromSource(dirtyRef.current, sourceKeyRef.current, nextKey)) {
      sourceKeyRef.current = nextKey;
      setDraft(source);
    }
  }, [blockId, source]);

  const setDraftTracked = useCallback((action: React.SetStateAction<T>) => {
    setDraft(action);
    setDirty(true);
  }, []);

  const resetFromSource = useCallback(() => {
    setDraft(source);
    sourceKeyRef.current = serialize(source);
    setDirty(false);
  }, [source, serialize]);

  const markCommitted = useCallback(
    (committed?: T) => {
      const value = committed ?? draft;
      sourceKeyRef.current = serialize(value);
      setDirty(false);
      if (committed !== undefined) {
        setDraft(committed);
      }
    },
    [draft, serialize],
  );

  return {
    draft,
    setDraft: setDraftTracked,
    dirty,
    resetFromSource,
    markCommitted,
  };
}
