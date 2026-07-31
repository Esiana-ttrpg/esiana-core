import { Plus, Trash2 } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  CHARACTER_LOCATION_ROLES,
  formatCharacterLocationRoleLabel,
  type CharacterLocationRelation,
  type CharacterLocationRole,
} from '@shared/characterLocationRelations';
import { filterLocationPages } from '@/lib/questHubLayout';
import type { WikiTreeNode } from '@/types/wiki';

interface CharacterLocationRelationsEditorProps {
  flatPages: WikiTreeNode[];
  relations: CharacterLocationRelation[];
  onChange: (next: CharacterLocationRelation[]) => void;
  disabled?: boolean;
}

export function CharacterLocationRelationsEditor({
  flatPages,
  relations,
  onChange,
  disabled,
}: CharacterLocationRelationsEditorProps) {
  const locationPages = filterLocationPages(flatPages);

  function updateRow(index: number, patch: Partial<CharacterLocationRelation>) {
    const next = relations.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(relations.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([
      ...relations,
      { locationPageId: '', role: 'resident', featured: false },
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={META_FIELD_LABEL_CLASS}>Places in the world</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] text-muted hover:text-foreground disabled:opacity-50"
          onClick={addRow}
          disabled={disabled}
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
      {relations.length === 0 ? (
        <p className="text-xs text-muted">
          Link notable residences, visits, and former homes — location pages derive People sections from these.
        </p>
      ) : null}
      <ul className="space-y-2">
        {relations.map((row, index) => (
          <li
            key={`${index}-${row.locationPageId}-${row.role}`}
            className="grid gap-2 rounded-md border border-border/60 bg-surface-raised/40 p-2 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <IdentityPagePicker
              flatPages={locationPages}
              value={row.locationPageId || null}
              placeholder="Location…"
              onChange={(nextId) =>
                updateRow(index, { locationPageId: nextId ?? '' })
              }
            />
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              value={row.role}
              disabled={disabled}
              onChange={(e) =>
                updateRow(index, { role: e.target.value as CharacterLocationRole })
              }
            >
              {CHARACTER_LOCATION_ROLES.map((role) => (
                <option key={role} value={role}>
                  {formatCharacterLocationRoleLabel(role)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[10px] text-muted whitespace-nowrap">
              <input
                type="checkbox"
                checked={row.featured === true}
                disabled={disabled}
                onChange={(e) => updateRow(index, { featured: e.target.checked })}
              />
              Featured
            </label>
            <button
              type="button"
              className="justify-self-end text-muted hover:text-destructive disabled:opacity-50"
              onClick={() => removeRow(index)}
              disabled={disabled}
              aria-label="Remove location relation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
