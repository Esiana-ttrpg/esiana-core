import { useEffect, useRef, type MutableRefObject } from 'react';

export type MapDiscardGuard = MutableRefObject<(() => boolean) | null>;

/** A shared guard lets tool changes and edit-mode changes respect form drafts. */
export function useMapEditorDraft(open: boolean, identity: string | undefined, onClose: () => void, guardRef?: MapDiscardGuard, busy = false) {
  const dirty = useRef(false);
  useEffect(() => { dirty.current = false; }, [identity, open]);
  const discard = () => !busy && (!dirty.current || window.confirm('Discard unsaved map properties?'));
  const close = () => { if (discard()) onClose(); };
  useEffect(() => {
    if (!open) return;
    if (guardRef) guardRef.current = discard;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // A nested modal owns Escape until it is closed.
      if (document.querySelector('[data-map-nested-dialog]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => { if (guardRef) guardRef.current = null; window.removeEventListener('keydown', onKey); };
  });
  return { close, markDirty: () => { dirty.current = true; } };
}
