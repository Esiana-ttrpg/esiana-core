import { useEffect, useState, type ReactNode } from 'react';
import { X, Minimize2 } from 'lucide-react';

interface BlockFocusOverlayProps {
  blockId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onCollapseToExpanded: () => void;
  children: ReactNode;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function BlockFocusOverlay({
  blockId,
  title,
  isOpen,
  onClose,
  onCollapseToExpanded,
  children,
}: BlockFocusOverlayProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    if (prefersReducedMotion()) {
      setEntered(true);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, blockId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`block-focus-title-${blockId}`}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-150 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Close focus mode"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-border bg-surface shadow-2xl transition-all duration-200 ease-out sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-4xl sm:rounded-2xl sm:border ${
          entered ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-4 opacity-0 sm:scale-[0.98]'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 safe-area-inset-top">
          <h2
            id={`block-focus-title-${blockId}`}
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCollapseToExpanded}
              className="hidden rounded-md p-2 text-muted hover:bg-elevated hover:text-foreground sm:inline-flex"
              title="Exit focus (keep expanded)"
            >
              <Minimize2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted hover:bg-elevated hover:text-foreground"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3 sm:hidden">
          <button
            type="button"
            onClick={onCollapseToExpanded}
            className="rounded-md px-3 py-2 text-xs font-medium text-muted hover:bg-elevated hover:text-foreground"
          >
            Keep expanded
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary/15 px-3 py-2 text-xs font-medium text-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
