import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import {
  createWikiPageAlias,
  deleteWikiPageAlias,
  listWikiPageAliases,
} from '@/lib/wikiLoreGraph';

interface WikiPageAliasRow {
  id: string;
  alias: string;
}

interface WikiPageAliasesEditorProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
}

export function WikiPageAliasesEditor({
  campaignHandle,
  pageId,
  pageTitle,
}: WikiPageAliasesEditorProps) {
  const [aliases, setAliases] = useState<WikiPageAliasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listWikiPageAliases(campaignHandle, pageId);
      setAliases(rows.map((r) => ({ id: r.id, alias: r.alias })));
    } catch {
      setAliases([]);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createWikiPageAlias(campaignHandle, pageId, trimmed);
      setAliases((prev) => [...prev, { id: created.id, alias: created.alias }]);
      setDraft('');
    } catch {
      setError('That alias is already used in this campaign.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted">
        Alternate names for [[wikilinks]] and autocomplete (canonical title: {pageTitle}).
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted" />
      ) : (
        <ul className="space-y-1">
          {aliases.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded border border-border/60 px-2 py-1 text-sm"
            >
              <span>{row.alias}</span>
              <button
                type="button"
                className="text-muted hover:text-foreground"
                aria-label={`Remove alias ${row.alias}`}
                onClick={async () => {
                  await deleteWikiPageAlias(campaignHandle, row.id);
                  setAliases((prev) => prev.filter((a) => a.id !== row.id));
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
          placeholder="Add alias…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAdd();
          }}
        />
        <button
          type="button"
          disabled={saving || !draft.trim()}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted/20 disabled:opacity-50"
          onClick={() => void handleAdd()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
