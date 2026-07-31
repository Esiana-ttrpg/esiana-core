import { Plus, Trash2 } from 'lucide-react';
import type { PartyDraftRow } from './types';

interface PartyStepProps {
  rows: PartyDraftRow[];
  onChange: (rows: PartyDraftRow[]) => void;
}

function newRowId(): string {
  return crypto.randomUUID();
}

export function PartyStep({ rows, onChange }: PartyStepProps) {
  function addRow() {
    onChange([...rows, { id: newRowId(), name: '', role: '', hook: '' }]);
  }

  function updateRow(id: string, patch: Partial<PartyDraftRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id));
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Quick party creation</h3>
        <p className="mt-1 text-sm text-muted">
          Add lightweight character records for your starting cast. This is not a full character
          builder—you can flesh them out later in the wiki.
        </p>
      </div>

      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Character</p>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded p-1 text-muted hover:bg-elevated hover:text-foreground"
                aria-label="Remove character"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              placeholder="Character name"
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              value={row.role ?? ''}
              onChange={(e) => updateRow(row.id, { role: e.target.value })}
              placeholder="Role or class (optional)"
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <textarea
              value={row.hook ?? ''}
              onChange={(e) => updateRow(row.id, { hook: e.target.value })}
              placeholder="Short hook or description (optional)"
              rows={2}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-elevated"
      >
        <Plus className="size-4" />
        Add character
      </button>
    </section>
  );
}
