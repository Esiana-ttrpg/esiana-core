import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import {
  getPageExportHandlers,
  type PageExportContext,
} from '@/lib/pageExport';

function menuItemClass(): string {
  return 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors text-foreground hover:bg-surface/80';
}

interface WikiPageExportMenuProps {
  isTagsHub: boolean;
  getExportContext: () => PageExportContext;
}

export function WikiPageExportMenu({
  isTagsHub,
  getExportContext,
}: WikiPageExportMenuProps) {
  const [open, setOpen] = useState(false);
  const handlers = getPageExportHandlers();

  if (isTagsHub || handlers.length === 0) return null;

  return (
    <div className="relative" data-print-hide>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Export page"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-muted transition-all hover:border-border/60 hover:bg-surface/60 hover:text-foreground"
      >
        <Download className="size-3.5 shrink-0" aria-hidden />
        <span>Export</span>
        <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close export menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-border bg-surface p-1 shadow-lg"
            role="menu"
          >
            {handlers.map((handler) => {
              const Icon = handler.icon;
              return (
                <button
                  key={handler.id}
                  type="button"
                  role="menuitem"
                  className={menuItemClass()}
                  onClick={() => {
                    setOpen(false);
                    void Promise.resolve(handler.run(getExportContext()));
                  }}
                >
                  {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                  {handler.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
