import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DramaticTopologyFinding } from '@shared/dramaticTopology';

interface DramaticPacingPanelProps {
  findings: DramaticTopologyFinding[];
}

export function DramaticPacingPanel({ findings }: DramaticPacingPanelProps) {
  const [open, setOpen] = useState(findings.length > 0);

  if (findings.length === 0) return null;

  return (
    <div className="rounded-md border border-border/80 bg-card/40 p-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-sm font-medium"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Dramatic pacing ({findings.length})
      </button>
      {open ? (
        <ul className="mt-2 space-y-1.5">
          {findings.map((finding, index) => (
            <li
              key={`${finding.kind}-${index}`}
              className={`rounded border px-2 py-1.5 text-xs ${
                finding.severity === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-border bg-muted/20'
              }`}
            >
              {finding.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
