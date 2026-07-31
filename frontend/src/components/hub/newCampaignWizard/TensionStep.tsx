import type { TensionDraft, TensionKind } from './types';

const TENSION_OPTIONS: Array<{
  kind: TensionKind;
  label: string;
  example: string;
}> = [
  {
    kind: 'character',
    label: 'Character',
    example: 'A corrupt noble begins taking hostages.',
  },
  {
    kind: 'organization',
    label: 'Organization',
    example: 'The Iron Covenant imposes new rule.',
  },
  {
    kind: 'location',
    label: 'Location',
    example: 'A plague spreads from the western marshes.',
  },
  {
    kind: 'unknown',
    label: 'Unknown force',
    example: 'Something is happening, but nobody knows why.',
  },
];

interface TensionStepProps {
  tension: TensionDraft | null;
  onChange: (tension: TensionDraft | null) => void;
}

export function TensionStep({ tension, onChange }: TensionStepProps) {
  const selectedKind = tension?.kind ?? null;

  function selectKind(kind: TensionKind) {
    onChange({
      kind,
      title: tension?.title ?? '',
      description: tension?.description,
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          What is the first source of tension?
        </h3>
        <p className="mt-1 text-sm text-muted">
          Seed the first narrative conflict in your world. You can skip and add this later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TENSION_OPTIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            onClick={() => selectKind(option.kind)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              selectedKind === option.kind
                ? 'border-primary/60 bg-primary/10'
                : 'border-border bg-background/50 hover:border-border'
            }`}
          >
            <p className="text-sm font-semibold text-foreground">{option.label}</p>
            <p className="mt-2 text-xs text-muted">{option.example}</p>
          </button>
        ))}
      </div>

      {selectedKind ? (
        <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
          <input
            type="text"
            value={tension?.title ?? ''}
            onChange={(e) =>
              onChange({
                kind: selectedKind,
                title: e.target.value,
                description: tension?.description,
              })
            }
            placeholder="Name or headline for this tension"
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <textarea
            value={tension?.description ?? ''}
            onChange={(e) =>
              onChange({
                kind: selectedKind,
                title: tension?.title ?? '',
                description: e.target.value,
              })
            }
            placeholder="Optional detail (one or two sentences)"
            rows={3}
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
      ) : null}
    </section>
  );
}
