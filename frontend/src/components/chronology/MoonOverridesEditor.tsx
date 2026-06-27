import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { MoonOverride } from '@/lib/chronologyApi';

interface MoonOverridesEditorProps {
  value: MoonOverride[] | null;
  onChange: (next: MoonOverride[] | null) => void;
}

export function MoonOverridesEditor({ value, onChange }: MoonOverridesEditorProps) {
  const rows = value ?? [];
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between">
        <p className={META_SECTION_LABEL_CLASS}>Moon Overrides</p>
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-elevated"
          onClick={() =>
            onChange([
              ...rows,
              {
                moonId: '',
                mode: 'FORCE_PHASE',
                phase: '',
              },
            ])
          }
        >
          Add override
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-muted">No moon overrides configured.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid gap-2 rounded border border-border p-2 md:grid-cols-4">
              <input
                value={row.moonId}
                onChange={(event) => {
                  const next = rows.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, moonId: event.target.value } : item,
                  );
                  onChange(next);
                }}
                placeholder="moonId"
                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
              />
              <select
                value={row.mode}
                onChange={(event) => {
                  const next = rows.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, mode: event.target.value as 'FORCE_PHASE' | 'OFFSET' }
                      : item,
                  );
                  onChange(next);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
              >
                <option value="FORCE_PHASE">FORCE_PHASE</option>
                <option value="OFFSET">OFFSET</option>
              </select>
              <input
                value={row.phase ?? ''}
                onChange={(event) => {
                  const next = rows.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, phase: event.target.value } : item,
                  );
                  onChange(next);
                }}
                placeholder="phase"
                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={row.offset ?? 0}
                  onChange={(event) => {
                    const next = rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, offset: Number(event.target.value) || 0 }
                        : item,
                    );
                    onChange(next);
                  }}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                />
                <button
                  type="button"
                  className="text-[11px] text-red-300"
                  onClick={() => {
                    const next = rows.filter((_, itemIndex) => itemIndex !== index);
                    onChange(next.length > 0 ? next : null);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
