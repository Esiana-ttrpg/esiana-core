import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';
import { BookOpen, X } from 'lucide-react';
import type { SourceProviderPresentation, SourceSearchResult } from '@shared/sourceReferences';
import { fetchSourceProviders, searchSourceProviders } from '@/lib/sourceReferencesApi';

export interface SourcePickerRequest {
  editor: Editor;
  /** Document content at the moment the picker was opened. */
  doc: ProseMirrorNode;
  range: { from: number; to: number };
  replaceRange?: { from: number; to: number };
}

export const OPEN_SOURCE_PICKER_EVENT = 'esiana:open-source-picker';

function ProviderIcon({ provider }: { provider?: SourceProviderPresentation }) {
  const [failed, setFailed] = useState(false);
  const favicon = provider?.origin?.startsWith('http')
    ? new URL('/favicon.ico', provider.origin).toString()
    : undefined;
  const src = provider?.icon?.startsWith('http') ? provider.icon : favicon;
  if (!src || failed) return <BookOpen className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />;
  return <img src={src} alt="" className="mt-0.5 size-4 shrink-0 rounded-sm object-contain" onError={() => setFailed(true)} />;
}

export function SourcePicker({ campaignId, request, onClose }: { campaignId: string; request: SourcePickerRequest; onClose: () => void }) {
  const [providers, setProviders] = useState<SourceProviderPresentation[]>([]);
  const [providerId, setProviderId] = useState('');
  const [query, setQuery] = useState('');
  const [locator, setLocator] = useState('');
  const [results, setResults] = useState<SourceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestNumber = useRef(0);

  useEffect(() => { fetchSourceProviders(campaignId).then(setProviders).catch(() => setProviders([])); }, [campaignId]);
  useEffect(() => {
    setResults([]);
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const current = ++requestNumber.current;
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      searchSourceProviders(campaignId, query.trim(), providerId || undefined, controller.signal)
        .then((data) => { if (current === requestNumber.current) { setResults(data.results); setError(data.results.length === 0 && data.diagnostics.length ? 'A source provider is unavailable.' : ''); } })
        .catch((cause) => { if (cause?.name !== 'AbortError' && current === requestNumber.current) setError('Source search failed.'); })
        .finally(() => { if (current === requestNumber.current) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [campaignId, providerId, query]);

  const choose = (result: SourceSearchResult) => {
    const { editor, doc, range, replaceRange } = request;
    if (!editor.state.doc.eq(doc)) {
      setResults([]);
      setError('The page changed while this picker was open. Close it and try again.');
      return;
    }
    const reference = { payloadVersion: 1 as const, identity: result.identity, metadata: result.metadata, ...(locator.trim() ? { locator: { label: locator.trim() } } : {}) };
    const chain = editor.chain().focus();
    if (replaceRange) chain.deleteRange(replaceRange);
    if (range.from !== range.to) chain.setTextSelection(range).applySourceReference(reference).run();
    else chain.setTextSelection(replaceRange ? replaceRange.from : range.from).insertSourceReferenceAtom(reference).run();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Add source">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><div className="font-medium text-foreground">Add source</div><div className="text-xs text-muted">Cite the selected claim or insert a citation.</div></div><button type="button" onClick={onClose} aria-label="Close source picker"><X className="size-4" /></button></div>
        <div className="grid gap-3 p-4 sm:grid-cols-[9rem_1fr]">
          <select value={providerId} onChange={(event) => setProviderId(event.target.value)} className="rounded-md border border-border bg-surface px-2 py-2 text-sm"><option value="">All providers</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}</select>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, documents, and compendiums…" className="rounded-md border border-border bg-surface px-3 py-2 text-sm" />
          <label className="sm:col-span-2 text-xs text-muted">Locator (optional)<input value={locator} onChange={(event) => setLocator(event.target.value)} placeholder="p. 42 or Chapter 7" className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground" /></label>
        </div>
        <div className="max-h-72 overflow-y-auto border-t border-border py-1">
          {loading ? <p className="px-4 py-6 text-center text-sm text-muted">Searching sources…</p> : null}
          {!loading && query.trim().length >= 2 && results.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted">{error || 'No sources found.'}</p> : null}
          {results.map((result) => <button key={`${result.identity.providerId}:${result.identity.sourceId}`} type="button" onClick={() => choose(result)} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-muted/20"><ProviderIcon provider={providers.find((provider) => provider.id === result.identity.providerId)} /><span><span className="block text-sm text-foreground">{result.metadata.title}</span><span className="block text-xs text-muted">{[result.metadata.authors?.join(', '), result.metadata.publisher, result.metadata.year].filter(Boolean).join(' · ') || result.identity.providerId}</span></span></button>)}
        </div>
      </div>
    </div>, document.body,
  );
}
