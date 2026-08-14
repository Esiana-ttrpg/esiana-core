import type { StartingLocationDraft } from './types';

interface LocationStepProps {
  startingLocation: StartingLocationDraft | null;
  onChange: (startingLocation: StartingLocationDraft | null) => void;
}

export function LocationStep({ startingLocation, onChange }: LocationStepProps) {
  const selectedMode = startingLocation?.mode ?? null;

  function selectMode(mode: StartingLocationDraft['mode']) {
    if (mode === 'later') {
      onChange({ mode: 'later' });
      return;
    }
    onChange({
      mode: 'new',
      title: startingLocation?.mode === 'new' ? startingLocation.title ?? '' : '',
      description: startingLocation?.mode === 'new' ? startingLocation.description : undefined,
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Where does the adventure begin?</h3>
        <p className="mt-1 text-sm text-muted">
          Optionally seed the opening location in your wiki. You can skip and add places later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => selectMode('new')}
          className={`rounded-xl border p-4 text-left transition-colors ${
            selectedMode === 'new'
              ? 'border-primary/60 bg-primary/10'
              : 'border-border bg-background/50 hover:border-border'
          }`}
        >
          <p className="text-sm font-semibold text-foreground">Create a new location</p>
          <p className="mt-2 text-xs text-muted">Lightweight name and optional blurb.</p>
        </button>
        <button
          type="button"
          onClick={() => selectMode('later')}
          className={`rounded-xl border p-4 text-left transition-colors ${
            selectedMode === 'later'
              ? 'border-primary/60 bg-primary/10'
              : 'border-border bg-background/50 hover:border-border'
          }`}
        >
          <p className="text-sm font-semibold text-foreground">Decide later</p>
          <p className="mt-2 text-xs text-muted">No starting location will be created yet.</p>
        </button>
      </div>

      {selectedMode === 'new' ? (
        <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
          <input
            type="text"
            value={startingLocation?.title ?? ''}
            onChange={(e) =>
              onChange({
                mode: 'new',
                title: e.target.value,
                description: startingLocation?.description,
              })
            }
            placeholder="Location name"
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <textarea
            value={startingLocation?.description ?? ''}
            onChange={(e) =>
              onChange({
                mode: 'new',
                title: startingLocation?.title ?? '',
                description: e.target.value,
              })
            }
            placeholder="Optional description (one or two sentences)"
            rows={3}
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
      ) : null}
    </section>
  );
}
