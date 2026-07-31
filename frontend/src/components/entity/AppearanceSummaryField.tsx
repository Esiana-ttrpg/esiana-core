import { APPEARANCE_SUMMARY_PLACEHOLDER } from '@/lib/appearanceSummaryPrompts';
import { formatAppearanceDescriptionGuidance } from '@/lib/appearanceFieldGuidance';
import { AppearanceFieldLabel } from '@/components/entity/appearance/AppearanceFieldLabel';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface AppearanceSummaryFieldProps {
  value: string | null;
  onChange: (summary: string | null) => void;
  onPersist: (summary: string | null) => void;
  id?: string;
}

export function AppearanceSummaryField({
  value,
  onChange,
  onPersist,
  id = 'appearance.summary',
}: AppearanceSummaryFieldProps) {
  const text = value ?? '';
  const inspirationId = useId();
  const [inspirationOpen, setInspirationOpen] = useState(false);

  return (
    <div className="space-y-2">
      <AppearanceFieldLabel label="Description" htmlFor={id} />
      <textarea
        id={id}
        className={`${fieldClass} min-h-[5rem] resize-y`}
        placeholder={APPEARANCE_SUMMARY_PLACEHOLDER}
        value={text}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={() => onPersist(value)}
      />
      <div>
        <button
          type="button"
          className="flex w-fit items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground"
          aria-expanded={inspirationOpen}
          aria-controls={inspirationId}
          onClick={() => setInspirationOpen((open) => !open)}
        >
          {inspirationOpen ? (
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          )}
          Writing inspiration
        </button>
        {inspirationOpen ? (
          <div
            id={inspirationId}
            className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-elevated/40 p-3 pb-4 text-xs leading-relaxed text-muted"
          >
            {formatAppearanceDescriptionGuidance()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
