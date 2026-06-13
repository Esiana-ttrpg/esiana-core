import { useState } from 'react';
import { ChevronDown, ExternalLink, HelpCircle } from 'lucide-react';
import {
  learnMoreLabel,
  narrativeSnapshotsHelpSections,
  narrativeSnapshotsHelpTrigger,
  NARRATIVE_SNAPSHOTS_USER_GUIDE_URL,
} from '@/lib/narrativeSnapshotsHelpCopy';

export function NarrativeSnapshotsHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-border/70 bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <HelpCircle className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="font-medium">{narrativeSnapshotsHelpTrigger}</span>
        <ChevronDown
          className={`ml-auto size-3.5 shrink-0 text-muted transition-transform ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/60 px-3 py-3 text-xs leading-relaxed text-muted">
          {narrativeSnapshotsHelpSections.map((section) => (
            <div key={section.title}>
              <p className="font-medium text-foreground">{section.title}</p>
              <p className="mt-1">{section.body}</p>
            </div>
          ))}
          <a
            href={NARRATIVE_SNAPSHOTS_USER_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {learnMoreLabel}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      ) : null}
    </div>
  );
}
