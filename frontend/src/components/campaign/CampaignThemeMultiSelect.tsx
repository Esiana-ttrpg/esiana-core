import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo, useState } from 'react';
import {
  CAMPAIGN_THEME_CATEGORIES,
  CAMPAIGN_THEMES,
  getCampaignThemeLabel,
  isCatalogThemeSlug,
  isCustomThemeValue,
} from '@shared/campaignThemes';
import { controlClasses } from '@/components/ui/formStyles';

export { getCampaignThemeLabel };

export interface CampaignThemeMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  inputClassName?: string;
  id?: string;
  /** Collapsed category sections and tighter chips (e.g. recruitment settings). */
  compact?: boolean;
}

export function CampaignThemeMultiSelect({
  values,
  onChange,
  inputClassName = controlClasses,
  id = 'campaign-themes',
  compact = false,
}: CampaignThemeMultiSelectProps) {
  const [customInput, setCustomInput] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<string, typeof CAMPAIGN_THEMES>();
    for (const category of CAMPAIGN_THEME_CATEGORIES) {
      map.set(
        category,
        CAMPAIGN_THEMES.filter((entry) => entry.category === category),
      );
    }
    return map;
  }, []);

  function toggleCatalogSlug(slug: string) {
    if (values.includes(slug)) {
      onChange(values.filter((value) => value !== slug));
    } else {
      onChange([...values, slug]);
    }
  }

  function removeValue(value: string) {
    onChange(values.filter((entry) => entry !== value));
  }

  function addCustomTheme() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const exists = values.some(
      (value) => value.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setCustomInput('');
      return;
    }
    onChange([...values, trimmed]);
    setCustomInput('');
  }

  const chipClass = (selected: boolean) =>
    compact
      ? `rounded border px-2 py-0.5 text-xs transition-colors ${
          selected
            ? 'border-primary/60 bg-primary/15 text-primary'
            : 'border-border/80 bg-background/60 text-foreground hover:border-border'
        }`
      : `rounded-full border px-3 py-1.5 text-sm transition-colors ${
          selected
            ? 'border-primary/60 bg-primary/20 text-primary'
            : 'border-border bg-surface text-foreground hover:border-border'
        }`;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'} id={id}>
      {CAMPAIGN_THEME_CATEGORIES.map((category) => {
        const entries = grouped.get(category) ?? [];
        if (entries.length === 0) return null;
        const selectedInCategory = entries.filter((entry) => values.includes(entry.slug)).length;
        const categoryBody = (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {entries.map((entry) => {
              const selected = values.includes(entry.slug);
              return (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => toggleCatalogSlug(entry.slug)}
                  className={chipClass(selected)}
                  aria-pressed={selected}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        );

        if (compact) {
          return (
            <details key={category} className="group rounded border border-border/60 bg-background/40">
              <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-muted marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>{category}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {selectedInCategory > 0
                      ? `${selectedInCategory} selected`
                      : `${entries.length} themes`}
                  </span>
                </span>
              </summary>
              <div className="border-t border-border/60 px-2.5 pb-2">{categoryBody}</div>
            </details>
          );
        }

        return (
          <div key={category}>
            <p className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
              {category}
            </p>
            {categoryBody}
          </div>
        );
      })}

      <div>
        <label htmlFor={`${id}-custom`} className="mb-1 block text-xs text-muted">
          Add custom theme
        </label>
        <div className="flex gap-2">
          <input
            id={`${id}-custom`}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addCustomTheme();
              }
            }}
            placeholder="e.g. Gothic Romance, Kitchen Sink Drama"
            className={inputClassName}
          />
          <button
            type="button"
            onClick={addCustomTheme}
            className="shrink-0 rounded border border-border bg-surface px-3 py-2 text-sm text-foreground hover:border-primary/40"
          >
            Add
          </button>
        </div>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => {
            const isCustom = isCustomThemeValue(value);
            const label = isCatalogThemeSlug(value)
              ? getCampaignThemeLabel(value)
              : value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => removeValue(value)}
                className={`rounded-full border px-2 py-1 text-xs text-foreground ${
                  isCustom
                    ? 'border-dashed border-border bg-background/80'
                    : 'border-border bg-surface'
                }`}
                title="Remove theme"
              >
                {label} ×
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
