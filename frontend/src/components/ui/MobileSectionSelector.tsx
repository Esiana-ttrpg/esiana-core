import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface MobileSectionOption {
  id: string;
  label: string;
  badge?: ReactNode;
}

export function MobileSectionSelector({ sections, activeId, onChange, actions = [], ariaLabel = 'Sections' }: {
  sections: readonly MobileSectionOption[];
  activeId: string;
  onChange: (id: string) => void;
  actions?: readonly { label: string; onClick: () => void }[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const active = sections.find((section) => section.id === activeId);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={triggerRef} type="button" aria-label={ariaLabel + ': ' + (active?.label ?? 'Select section')} aria-expanded={open} aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-elevated">
        <span className="min-w-0 flex-1 truncate">{active?.label ?? 'Select section'}</span>
        {active?.badge}
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      {open ? (
        <nav id={menuId} aria-label={ariaLabel} className="absolute inset-x-0 top-full z-50 mt-1 max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-1 shadow-xl">
          {sections.map((section) => (
            <div key={section.id}>
              <button type="button" aria-current={section.id === activeId ? 'page' : undefined}
                onClick={() => { onChange(section.id); setOpen(false); triggerRef.current?.focus(); }}
                className={'flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ' + (section.id === activeId ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-elevated')}>
                <span className="min-w-0 flex-1 break-words">{section.label}</span>{section.badge}
              </button>
            </div>
          ))}
          {actions.map((action) => (
            <button key={action.label} type="button"
              className="mt-1 flex min-h-11 w-full items-center rounded-md border-t border-border px-3 py-2 text-left text-sm text-foreground hover:bg-elevated"
              onClick={() => { setOpen(false); triggerRef.current?.focus(); action.onClick(); }}>
              {action.label}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
