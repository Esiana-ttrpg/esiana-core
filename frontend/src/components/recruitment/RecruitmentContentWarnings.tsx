import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface RecruitmentContentWarningsProps {
  contentWarnings: string | null;
}

export function RecruitmentContentWarnings({ contentWarnings }: RecruitmentContentWarningsProps) {
  const text = contentWarnings?.trim();
  if (!text) return null;

  const [open, setOpen] = useState(false);

  return (
    <section className="pb-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-amber-100/90">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Content warnings
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-amber-100/70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Tap to view content warnings before applying.</p>
      )}
    </section>
  );
}
