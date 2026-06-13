import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProjectionDebugPanelProps {
  title?: string;
  projection: unknown;
  queryInputs?: Record<string, unknown>;
}

export function ProjectionDebugPanel({
  title = 'Relation projection debug',
  projection,
  queryInputs,
}: ProjectionDebugPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-3 rounded-md border border-amber-600/40 bg-amber-950/20">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-amber-200/90"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {title}
      </button>
      {open ? (
        <div className="space-y-2 border-t border-amber-600/30 px-3 py-2">
          {queryInputs ? (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase text-amber-200/70">Query</p>
              <pre className="overflow-x-auto text-[10px] leading-relaxed text-amber-100/90">
                {JSON.stringify(queryInputs, null, 2)}
              </pre>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase text-amber-200/70">Projection</p>
            <pre className="max-h-64 overflow-auto text-[10px] leading-relaxed text-amber-100/90">
              {JSON.stringify(projection, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
