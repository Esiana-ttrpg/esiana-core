import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { SafetyToolGlossaryEntry } from '@shared/safetyToolsGlossary';

interface SafetyToolHelpProps {
  entry: SafetyToolGlossaryEntry;
}

export function SafetyToolHelp({ entry }: SafetyToolHelpProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <span className="relative inline-flex items-center gap-1">
      <span className="font-medium text-foreground">{entry.label}</span>
      <button
        type="button"
        className="inline-flex text-muted hover:text-foreground"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`What is ${entry.label}?`}
        onClick={() => setOpen((value) => !value)}
      >
        <HelpCircle className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-elevated p-3 text-xs leading-relaxed text-foreground shadow-lg"
        >
          {entry.description}
        </span>
      ) : null}
    </span>
  );
}
