import { Search, X } from 'lucide-react';

interface CategoryIndexSearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  id?: string;
}

export function CategoryIndexSearchInput({
  value = '',
  placeholder,
  onChange,
  onClear,
  id = 'category-index-search',
}: CategoryIndexSearchInputProps) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        autoComplete="off"
      />
      {(value ?? '').length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
