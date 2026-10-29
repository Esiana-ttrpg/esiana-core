import { useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { createPortal } from 'react-dom';

/** Native modal supplies focus containment, background inertness and focus restoration. */
export function ChronologyEventDialog({
  title,
  dirty,
  busy,
  onClose,
  children,
}: {
  title: string;
  dirty: boolean;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mountedRef = useRef(false);
  const titleId = useId();
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const state = useRef({ dirty, busy, onClose });
  state.current = { dirty, busy, onClose };
  const allowLeave = () =>
    !state.current.busy &&
    (!state.current.dirty || window.confirm('Discard unsaved event changes?'));
  const close = () => {
    if (allowLeave()) state.current.onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    mountedRef.current = true;
    dialog.showModal();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (state.current.dirty || state.current.busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    // BrowserRouter does not support useBlocker. Guard its navigation methods and
    // history traversal here so the editor survives a rejected navigation.
    const push = navigator.push;
    const replace = navigator.replace;
    navigator.push = (...args) => {
      if (allowLeave()) {
        state.current.onClose();
        push.apply(navigator, args);
      }
    };
    navigator.replace = (...args) => {
      if (allowLeave()) {
        state.current.onClose();
        replace.apply(navigator, args);
      }
    };
    const startIndex: number | undefined = window.history.state?.idx;
    let restoring = false;
    const pop = (event: PopStateEvent) => {
      if (restoring) {
        restoring = false;
        event.stopImmediatePropagation();
        return;
      }
      if (allowLeave()) {
        state.current.onClose();
        return;
      }
      const nextIndex: number | undefined = event.state?.idx;
      if (startIndex !== undefined && nextIndex !== undefined) {
        event.stopImmediatePropagation();
        restoring = true;
        window.history.go(startIndex - nextIndex);
      }
    };
    const externalLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(
        'a[href]',
      ) as HTMLAnchorElement | null;
      if (!link || !dialog.contains(link)) return;
      const external =
        link.origin !== window.location.origin ||
        link.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey;
      if (external && !allowLeave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', pop, true);
    document.addEventListener('click', externalLink, true);
    return () => {
      mountedRef.current = false;
      navigator.push = push;
      navigator.replace = replace;
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('popstate', pop, true);
      document.removeEventListener('click', externalLink, true);
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [navigator]);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={(event) => {
        const dialog = event.currentTarget;
        if (!mountedRef.current || event.target !== dialog || dialog.open) return;
        dialog.showModal();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          const rect = dialogRef.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }
      }}
      className="fixed inset-0 m-auto h-dvh max-h-dvh w-screen max-w-none overflow-y-auto border border-border bg-background p-4 text-foreground backdrop:bg-black/60 md:h-auto md:max-h-[90dvh] md:w-[min(720px,90vw)] md:rounded-xl md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-serif text-xl">
          {title}
        </h2>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          className="rounded border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          Close
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
