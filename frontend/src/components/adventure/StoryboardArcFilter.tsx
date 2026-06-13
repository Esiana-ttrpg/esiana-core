interface StoryboardArcFilterProps {
  arcOptions: Array<{ id: string; title: string }>;
  selectedArcIds: string[];
  readOnly?: boolean;
  onChange: (arcIds: string[]) => void;
}

export function StoryboardArcFilter({
  arcOptions,
  selectedArcIds,
  readOnly = false,
  onChange,
}: StoryboardArcFilterProps) {
  if (arcOptions.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Filter by campaign arc
      </p>
      <div className="flex flex-wrap gap-1.5">
        {arcOptions.map((arc) => {
          const active = selectedArcIds.includes(arc.id);
          return (
            <button
              key={arc.id}
              type="button"
              disabled={readOnly}
              className={`rounded border px-2 py-0.5 text-xs ${
                active
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border bg-muted/20 text-muted-foreground'
              }`}
              onClick={() => {
                if (readOnly) return;
                const next = active
                  ? selectedArcIds.filter((id) => id !== arc.id)
                  : [...selectedArcIds, arc.id];
                onChange(next);
              }}
            >
              {arc.title}
            </button>
          );
        })}
        {selectedArcIds.length > 0 && !readOnly ? (
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
