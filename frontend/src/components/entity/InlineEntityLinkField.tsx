import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface InlineEntityLinkFieldProps {
  flatPages: WikiTreeNode[];
  placeholder?: string;
  onSelectPage: (pageId: string, title: string) => void;
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

export function InlineEntityLinkField({
  flatPages,
  placeholder = 'Link entity — type [[name or search…',
  onSelectPage,
}: InlineEntityLinkFieldProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = normalizeQuery(query.replace(/^\[\[/, '').replace(/\]\]$/, ''));
    if (!q) return flatPages.slice(0, 8);
    return flatPages
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [flatPages, query]);

  function apply(page: WikiTreeNode) {
    onSelectPage(page.id, page.title);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && suggestions[0]) {
      e.preventDefault();
      apply(suggestions[0]);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative space-y-1">
      <div className="flex items-center gap-1.5 META_SECTION_LABEL_CLASS">
        <Link2 className="size-3" aria-hidden />
        <span>Quick link</span>
      </div>
      <input
        className={fieldClass}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 ? (
        <ul
          className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((page) => (
            <li key={page.id} role="option">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-elevated"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(page)}
              >
                <span className="font-medium text-foreground">{page.title}</span>
                <span className="shrink-0 rounded bg-surface px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted">
                  {page.templateType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[10px] text-muted">
        Tip: use <code className="text-foreground">[[Name]]</code> in biography prose for wiki
        links.
      </p>
    </div>
  );
}
