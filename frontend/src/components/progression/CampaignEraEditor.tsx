import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CampaignEra, CampaignMomentumState } from '@shared/factionMomentumMetadata';
import { createCampaignEraId } from '@/lib/progressionEraIds';

interface CampaignEraEditorProps {
  state: CampaignMomentumState;
  saving: boolean;
  onSave: (eras: CampaignEra[]) => Promise<void>;
}

export function CampaignEraEditor({ state, saving, onSave }: CampaignEraEditorProps) {
  const [draftEras, setDraftEras] = useState<CampaignEra[]>(state.eras);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateEra(index: number, patch: Partial<CampaignEra>) {
    setDraftEras((eras) =>
      eras.map((era, i) => (i === index ? { ...era, ...patch } : era)),
    );
  }

  function setCurrentEra(index: number) {
    setDraftEras((eras) =>
      eras.map((era, i) => ({ ...era, isCurrent: i === index })),
    );
  }

  function addEra() {
    const nextOrder = draftEras.length;
    setDraftEras((eras) => [
      ...eras,
      {
        id: createCampaignEraId(),
        name: `Era ${nextOrder + 1}`,
        sortOrder: nextOrder,
        isCurrent: false,
        epochStartMinute: null,
        epochEndMinute: null,
        narrativeNote: null,
      },
    ]);
  }

  function removeEra(index: number) {
    if (draftEras.length <= 1) return;
    setDraftEras((eras) => {
      const next = eras.filter((_, i) => i !== index);
      if (!next.some((era) => era.isCurrent)) {
        next[0] = { ...next[0]!, isCurrent: true };
      }
      return next.map((era, i) => ({ ...era, sortOrder: i }));
    });
  }

  async function handleSave() {
    setError(null);
    try {
      await onSave(draftEras);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save eras');
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-surface/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Campaign eras</h3>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save eras'}
        </button>
      </div>

      <ul className="space-y-3">
        {draftEras.map((era, index) => (
          <li
            key={era.id}
            className="rounded-md border border-border/60 bg-background/60 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="current-era"
                  checked={era.isCurrent}
                  onChange={() => setCurrentEra(index)}
                />
                Current
              </label>
              <input
                type="text"
                value={era.name}
                onChange={(e) => updateEra(index, { name: e.target.value })}
                className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                placeholder="Era name"
              />
              {draftEras.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeEra(index)}
                  className="rounded p-1 text-muted hover:text-foreground"
                  aria-label={`Remove ${era.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
            {showAdvanced ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">
                  Epoch start (minutes)
                  <input
                    type="text"
                    value={era.epochStartMinute ?? ''}
                    onChange={(e) =>
                      updateEra(index, {
                        epochStartMinute: e.target.value.trim() || null,
                      })
                    }
                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Epoch end (minutes)
                  <input
                    type="text"
                    value={era.epochEndMinute ?? ''}
                    onChange={(e) =>
                      updateEra(index, {
                        epochEndMinute: e.target.value.trim() || null,
                      })
                    }
                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-muted-foreground sm:col-span-2">
                  Narrative note
                  <textarea
                    value={era.narrativeNote ?? ''}
                    onChange={(e) =>
                      updateEra(index, {
                        narrativeNote: e.target.value.trim() || null,
                      })
                    }
                    rows={2}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                </label>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addEra}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:border-primary/40"
        >
          <Plus className="size-3.5" />
          Add era
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? 'Hide advanced' : 'Advanced epoch bounds'}
        </button>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
