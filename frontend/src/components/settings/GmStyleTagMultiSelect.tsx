import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo, useState } from 'react';
import { GM_STYLE_TAGS, getGmStyleTagLabel } from '@shared/gmStyleTags';
import { controlClasses } from '@/components/ui/formStyles';

export interface GmStyleTagMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function GmStyleTagMultiSelect({ values, onChange }: GmStyleTagMultiSelectProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return GM_STYLE_TAGS;
    return GM_STYLE_TAGS.filter(
      (entry) =>
        entry.label.toLowerCase().includes(query) ||
        entry.slug.toLowerCase().includes(query),
    );
  }, [search]);

  function toggleSlug(slug: string) {
    if (values.includes(slug)) {
      onChange(values.filter((value) => value !== slug));
    } else {
      onChange([...values, slug]);
    }
  }

  return (
    <div className="space-y-3">
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleSlug(value)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
            >
              {getGmStyleTagLabel(value)}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      <label className="block md:hidden">
        <span className={META_FIELD_LABEL_CLASS}>
          Add style tag
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search style tags…"
          className={controlClasses}
        />
      </label>

      <div className="hidden flex-wrap gap-2 md:flex">
        {GM_STYLE_TAGS.map((entry) => {
          const selected = values.includes(entry.slug);
          return (
            <button
              key={entry.slug}
              type="button"
              onClick={() => toggleSlug(entry.slug)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selected
                  ? 'border-primary/60 bg-primary/20 text-primary'
                  : 'border-border bg-surface text-foreground hover:border-border'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1 md:hidden">
        {filtered.map((entry) => {
          const selected = values.includes(entry.slug);
          return (
            <button
              key={entry.slug}
              type="button"
              onClick={() => toggleSlug(entry.slug)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm ${
                selected
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-surface text-foreground'
              }`}
            >
              {entry.label}
              {selected ? <span className="text-xs">Selected</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { getGmStyleTagLabel };
