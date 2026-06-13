import { X } from 'lucide-react';
import { ContinuitySection } from '@/components/adventure/ContinuitySection';
import type { NarrativePressureItem } from '@/lib/sceneMetadata';

interface ContinuityDrawerProps {
  open: boolean;
  onClose: () => void;
  pressureFeed: NarrativePressureItem[];
  issueCount: number;
}

export function ContinuityDrawer({
  open,
  onClose,
  pressureFeed,
  issueCount,
}: ContinuityDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Close continuity panel"
        onClick={onClose}
      />
      <aside
        className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-surface p-4 shadow-xl"
        aria-label="Continuity diagnostics"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Continuity
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <ContinuitySection pressureFeed={pressureFeed} issueCount={issueCount} />
      </aside>
    </>
  );
}
