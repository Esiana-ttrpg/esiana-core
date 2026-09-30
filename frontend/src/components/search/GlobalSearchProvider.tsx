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
import { GlobalSearchOverlay } from '@/components/search/GlobalSearchOverlay';

interface GlobalSearchContextValue {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  registerTrigger: (el: HTMLElement | null) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function GlobalSearchProvider({
  campaignHandle,
  campaignId,
  children,
}: {
  campaignHandle: string;
  campaignId?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => {
    setOpen(false);
    // Return focus to the trigger when closing.
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  const registerTrigger = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ open, openSearch, closeSearch, triggerRef, registerTrigger }),
    [open, openSearch, closeSearch, registerTrigger],
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      {open ? (
        <GlobalSearchOverlay
          campaignHandle={campaignHandle}
          campaignId={campaignId ?? null}
          onClose={closeSearch}
        />
      ) : null}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  }
  return ctx;
}

/** Safe variant for header chrome that may render outside the provider in tests. */
export function useGlobalSearchOptional(): GlobalSearchContextValue | null {
  return useContext(GlobalSearchContext);
}
