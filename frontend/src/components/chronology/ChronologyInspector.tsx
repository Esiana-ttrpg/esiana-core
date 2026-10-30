import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** Shared inspection surface. Editing stays in the existing native modal dialog. */
export function ChronologyInspector({ title, onClose, children, surfaceRef, label = title, closeLabel = 'Close inspector', selectionId = title }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  surfaceRef?: RefObject<HTMLElement | null>;
  label?: string;
  closeLabel?: string;
  selectionId?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!closeRef.current?.closest('aside')?.contains(active)) restoreFocus.current = active;
  }, [selectionId]);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => { if (restoreFocus.current?.isConnected) restoreFocus.current.focus({ preventScroll: true }); };
  }, []);
  return (
    <>
      <button type="button" tabIndex={-1} aria-label="Dismiss inspector" onClick={onClose}
        className="fixed inset-0 z-30 bg-black/30 md:hidden" />
      <aside ref={surfaceRef} aria-label={label} role={mobile ? 'dialog' : 'complementary'} aria-modal={mobile || undefined}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
          if (mobile && event.key === 'Tab') {
            const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
              .filter(item => item.getClientRects().length > 0);
            const first = items[0], last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col rounded-t-xl border border-border bg-background shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[min(380px,90%)] md:rounded-none md:border-y-0 md:border-r-0">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel}
            className="min-h-11 rounded border border-border px-3 text-sm">Close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
