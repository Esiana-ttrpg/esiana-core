import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface BlockDraftRegistration {
  blockId: string;
  isDirty: () => boolean;
  flush: () => Promise<void>;
}

export interface BlockFlushFailure {
  blockId: string;
  error: unknown;
}

export type BlockSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

export interface BlockSaveState {
  status: BlockSaveStatus;
  errorMessage?: string;
}

const IDLE_SAVE_STATE: BlockSaveState = { status: 'idle' };

interface PageBlockDraftRegistryValue {
  registerDraft: (entry: BlockDraftRegistration) => void;
  unregisterDraft: (blockId: string) => void;
  setDirty: (blockId: string, isDirty: boolean) => void;
  isBlockDirty: (blockId: string) => boolean;
  getBlockSaveState: (blockId: string) => BlockSaveState;
  setBlockSaveState: (
    blockId: string,
    status: BlockSaveStatus,
    errorMessage?: string,
  ) => void;
  flushBlock: (blockId: string) => Promise<void>;
  hasSemanticDirty: boolean;
  flushAll: () => Promise<BlockFlushFailure[]>;
}

const PageBlockDraftRegistryContext =
  createContext<PageBlockDraftRegistryValue | null>(null);

function PageBlockDraftRegistryProviderInner({ children }: { children: ReactNode }) {
  const entriesRef = useRef(new Map<string, BlockDraftRegistration>());
  const [dirtyBlockIds, setDirtyBlockIds] = useState<Set<string>>(() => new Set());
  const [saveStateByBlockId, setSaveStateByBlockId] = useState<
    Record<string, BlockSaveState>
  >({});
  const savedFadeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const setBlockSaveState = useCallback(
    (blockId: string, status: BlockSaveStatus, errorMessage?: string) => {
      setSaveStateByBlockId((prev) => {
        const current = prev[blockId]?.status;
        if (current === status && prev[blockId]?.errorMessage === errorMessage) {
          return prev;
        }
        if (status !== 'saved') {
          const timer = savedFadeTimersRef.current[blockId];
          if (timer) {
            clearTimeout(timer);
            delete savedFadeTimersRef.current[blockId];
          }
        }
        if (status === 'saved') {
          const existing = savedFadeTimersRef.current[blockId];
          if (existing) clearTimeout(existing);
          savedFadeTimersRef.current[blockId] = setTimeout(() => {
            setSaveStateByBlockId((inner) => {
              if (inner[blockId]?.status !== 'saved') return inner;
              const next = { ...inner };
              delete next[blockId];
              return next;
            });
            delete savedFadeTimersRef.current[blockId];
          }, 2000);
        }
        return {
          ...prev,
          [blockId]: { status, errorMessage },
        };
      });
    },
    [],
  );

  const setDirty = useCallback(
    (blockId: string, isDirty: boolean) => {
      setDirtyBlockIds((prev) => {
        const has = prev.has(blockId);
        if (isDirty === has) return prev;
        const next = new Set(prev);
        if (isDirty) next.add(blockId);
        else next.delete(blockId);
        return next;
      });
      setSaveStateByBlockId((prev) => {
        const current = prev[blockId]?.status;
        if (isDirty) {
          if (current === 'saving' || current === 'failed' || current === 'dirty') {
            return prev;
          }
          return { ...prev, [blockId]: { status: 'dirty' } };
        }
        if (current === 'dirty') {
          const next = { ...prev };
          delete next[blockId];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const registerDraft = useCallback((entry: BlockDraftRegistration) => {
    entriesRef.current.set(entry.blockId, entry);
  }, []);

  const unregisterDraft = useCallback((blockId: string) => {
    entriesRef.current.delete(blockId);
    setDirtyBlockIds((prev) => {
      if (!prev.has(blockId)) return prev;
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
  }, []);

  const flushBlock = useCallback(
    async (blockId: string) => {
      const entry = entriesRef.current.get(blockId);
      if (!entry?.isDirty()) return;
      setBlockSaveState(blockId, 'saving');
      try {
        await entry.flush();
        setDirty(blockId, entry.isDirty());
        if (!entry.isDirty()) {
          setBlockSaveState(blockId, 'saved');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to save block';
        setBlockSaveState(blockId, 'failed', message);
        throw error;
      }
    },
    [setBlockSaveState, setDirty],
  );

  const flushAll = useCallback(async (): Promise<BlockFlushFailure[]> => {
    const dirty = [...entriesRef.current.values()].filter((entry) => entry.isDirty());
    const results = await Promise.all(
      dirty.map(async (entry) => {
        try {
          await flushBlock(entry.blockId);
          return null;
        } catch (error) {
          return { blockId: entry.blockId, error };
        }
      }),
    );
    return results.filter((r): r is BlockFlushFailure => r != null);
  }, [flushBlock]);

  const isBlockDirty = useCallback(
    (blockId: string) => dirtyBlockIds.has(blockId),
    [dirtyBlockIds],
  );

  const getBlockSaveState = useCallback(
    (blockId: string): BlockSaveState => saveStateByBlockId[blockId] ?? IDLE_SAVE_STATE,
    [saveStateByBlockId],
  );

  useEffect(
    () => () => {
      Object.values(savedFadeTimersRef.current).forEach(clearTimeout);
    },
    [],
  );

  const value = useMemo(
    () => ({
      registerDraft,
      unregisterDraft,
      setDirty,
      isBlockDirty,
      getBlockSaveState,
      setBlockSaveState,
      flushBlock,
      hasSemanticDirty: dirtyBlockIds.size > 0,
      flushAll,
    }),
    [
      dirtyBlockIds.size,
      flushAll,
      flushBlock,
      getBlockSaveState,
      isBlockDirty,
      registerDraft,
      setBlockSaveState,
      setDirty,
      unregisterDraft,
    ],
  );

  return (
    <PageBlockDraftRegistryContext.Provider value={value}>
      {children}
    </PageBlockDraftRegistryContext.Provider>
  );
}

export function PageBlockDraftRegistryProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  if (!enabled) {
    return <>{children}</>;
  }
  return <PageBlockDraftRegistryProviderInner>{children}</PageBlockDraftRegistryProviderInner>;
}

export type { PageBlockDraftRegistryValue };

export function usePageBlockDraftRegistry(): PageBlockDraftRegistryValue | null {
  return useContext(PageBlockDraftRegistryContext);
}

/** Register a semantic block draft for coordinated flush + dirty state. */
export function useRegisterBlockDraft(
  blockId: string,
  dirty: boolean,
  flush: () => Promise<void>,
  enabled = true,
): void {
  const registry = usePageBlockDraftRegistry();
  const registryRef = useRef(registry);
  registryRef.current = registry;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    const reg = registryRef.current;
    if (!reg || !enabled) return;
    const entry: BlockDraftRegistration = {
      blockId,
      isDirty: () => dirtyRef.current,
      flush: () => flushRef.current(),
    };
    reg.registerDraft(entry);
    return () => reg.unregisterDraft(blockId);
  }, [blockId, enabled, registry]);

  useEffect(() => {
    const reg = registryRef.current;
    if (!reg || !enabled) return;
    reg.setDirty(blockId, dirty);
  }, [blockId, dirty, enabled]);
}
