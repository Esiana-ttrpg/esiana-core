import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo, useState } from 'react';
import { controlClasses } from '@/components/ui/formStyles';

export interface SuggestedTagMultiSelectProps {
  id: string;
  label: string;
  values: string[];
  suggestions?: readonly string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}

function chipClass(selected: boolean, compact: boolean) {
  return compact
    ? `rounded border px-2 py-0.5 text-xs transition-colors ${
        selected
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border/80 bg-background/60 text-foreground hover:border-border'
      }`
    : `rounded-full border px-2.5 py-1 text-xs transition-colors ${
        selected
          ? 'border-primary/60 bg-primary/20 text-primary'
          : 'border-border bg-surface text-foreground hover:border-border'
      }`;
}

export function SuggestedTagMultiSelect({
  id,
  label,
  values,
  suggestions = [],
  onChange,
  placeholder = 'Add custom entry…',
  compact = true,
}: SuggestedTagMultiSelectProps) {
  const [customInput, setCustomInput] = useState('');

  const selectedLower = useMemo(
    () => new Set(values.map((v) => v.toLowerCase())),
    [values],
  );

  function toggleSuggestion(suggestion: string) {
    if (selectedLower.has(suggestion.toLowerCase())) {
      onChange(values.filter((v) => v.toLowerCase() !== suggestion.toLowerCase()));
    } else {
      onChange([...values, suggestion]);
    }
  }

  function removeValue(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selectedLower.has(trimmed.toLowerCase())) {
      setCustomInput('');
      return;
    }
    onChange([...values, trimmed]);
    setCustomInput('');
  }

  return (
    <div className="space-y-2" id={id}>
      <span className={META_FIELD_LABEL_CLASS}>{label}</span>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => {
            const selected = selectedLower.has(suggestion.toLowerCase());
            return (
              <button
                key={suggestion}
                type="button"
                onClick={() => toggleSuggestion(suggestion)}
                className={chipClass(selected, compact)}
                aria-pressed={selected}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
          className={controlClasses}
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground hover:border-primary/40"
        >
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface-raised/50 px-2 py-0.5 text-xs text-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="text-muted hover:text-foreground"
                aria-label={`Remove ${value}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
