import { Plus, Trash2 } from 'lucide-react';
import type { SceneOutcome, SceneOutcomeEntry } from '@/lib/sceneMetadata';
import { SCENE_OUTCOMES } from '@/lib/sceneMetadata';
import { PageIdListEditor } from '@/components/entity/codexMetadataEditorShared';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface SceneOutcomeListEditorProps {
  outcomes: SceneOutcomeEntry[];
  flatPages: WikiTreeNode[];
  pickerPages: WikiTreeNode[];
  disabled?: boolean;
  onChange: (outcomes: SceneOutcomeEntry[]) => void;
}

export function SceneOutcomeListEditor({
  outcomes,
  flatPages,
  pickerPages,
  disabled = false,
  onChange,
}: SceneOutcomeListEditorProps) {
  function updateAt(index: number, patch: Partial<SceneOutcomeEntry>) {
    const copy = outcomes.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    onChange(copy);
  }

  function removeAt(index: number) {
    onChange(outcomes.filter((_, i) => i !== index));
  }

  function addOutcome() {
    onChange([
      ...outcomes,
      { outcomeType: 'information_revealed', description: null, linkedPageIds: [] },
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Outcomes
        </span>
        {!disabled ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:bg-muted/40"
            onClick={addOutcome}
          >
            <Plus className="size-3" />
            Add
          </button>
        ) : null}
      </div>
      {outcomes.length === 0 ? (
        <p className="text-[11px] text-muted">No typed outcomes defined.</p>
      ) : (
        <ul className="space-y-2">
          {outcomes.map((outcome, index) => (
            <li
              key={`outcome-${index}-${outcome.outcomeType}`}
              className="rounded-md border border-border/70 bg-background/40 p-2 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted">{outcome.outcomeType}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="text-muted hover:text-red-400"
                    aria-label="Remove outcome"
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <label className="block space-y-0.5">
                <span className="text-[10px] text-muted">Outcome type</span>
                <select
                  className={fieldClass}
                  disabled={disabled}
                  value={outcome.outcomeType}
                  onChange={(event) => {
                    updateAt(index, {
                      outcomeType: event.target.value as SceneOutcome,
                    });
                  }}
                >
                  {SCENE_OUTCOMES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-0.5">
                <span className="text-[10px] text-muted">Description</span>
                <textarea
                  className={`${fieldClass} min-h-[40px]`}
                  disabled={disabled}
                  value={outcome.description ?? ''}
                  onChange={(event) => {
                    updateAt(index, {
                      description: event.target.value || null,
                    });
                  }}
                />
              </label>
              <PageIdListEditor
                label="Linked pages"
                ids={outcome.linkedPageIds ?? []}
                pickerPages={pickerPages}
                flatPages={flatPages}
                placeholder="Pages affected by this outcome…"
                onChange={(linkedPageIds) => {
                  updateAt(index, { linkedPageIds });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
