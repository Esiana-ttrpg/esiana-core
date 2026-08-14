import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { CircleAlert } from 'lucide-react';
import {
  WIKI_ADMONITION_VARIANTS_LIST,
  type WikiAdmonitionVariant,
} from '@shared/wikiAdmonition';

interface AdmonitionToolbarDropdownProps {
  editor: Editor;
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted hover:bg-elevated hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export function AdmonitionToolbarDropdown({ editor }: AdmonitionToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const isInsideAdmonition = editor.isActive('admonition');

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handlePick = (variant: WikiAdmonitionVariant) => {
    if (editor.isActive('admonition')) {
      editor.chain().focus().setAdmonitionVariant(variant).run();
    } else {
      editor.chain().focus().insertAdmonition({ variant }).run();
    }
    setOpen(false);
  };

  const toggleOpen = () => {
    if (!open) updatePosition();
    setOpen((value) => !value);
  };

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <ToolbarButton
        title={isInsideAdmonition ? 'Change callout type' : 'Insert callout'}
        active={isInsideAdmonition || open}
        onClick={toggleOpen}
      >
        <CircleAlert className="size-4" />
      </ToolbarButton>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[200] w-72 rounded-xl border border-border bg-background/95 p-2 shadow-xl"
              style={{ top: position.top, left: position.left }}
              role="listbox"
              aria-label={isInsideAdmonition ? 'Change callout type' : 'Insert callout'}
            >
              <p className="mb-2 px-2 text-[11px] text-muted">
                {isInsideAdmonition ? 'Change callout type' : 'Insert callout'}
              </p>
              <ul className="max-h-80 space-y-0.5 overflow-y-auto">
                {WIKI_ADMONITION_VARIANTS_LIST.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      role="option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handlePick(entry.id)}
                      className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface/80"
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {entry.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {entry.pickerDescription}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
