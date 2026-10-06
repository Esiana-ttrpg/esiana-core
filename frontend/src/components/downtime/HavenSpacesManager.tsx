import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Search, Trash2 } from 'lucide-react';
import {
  HAVEN_SPACE_STATUSES,
  HAVEN_SPACE_TYPES,
  createHavenSpaceEntry,
  formatHavenSpaceStatusLabel,
  formatHavenSpaceTypeLabel,
  type HavenSpaceEntry,
  type HavenSpaceStatus,
  type HavenSpaceType,
} from '@shared/havenMetadata';

interface HavenSpacesManagerProps {
  spaces: HavenSpaceEntry[];
  onChange: (spaces: HavenSpaceEntry[]) => void;
}

const fieldClass = 'mt-1 w-full rounded border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary/60';

export function HavenSpacesManager({ spaces, onChange }: HavenSpacesManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(spaces[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const selected = spaces.find((space) => space.id === selectedId) ?? spaces[0] ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle
      ? spaces.filter((space) => `${space.label} ${formatHavenSpaceTypeLabel(space.type)} ${formatHavenSpaceStatusLabel(space.status)}`.toLocaleLowerCase().includes(needle))
      : spaces;
  }, [query, spaces]);

  function addSpace() {
    const next = createHavenSpaceEntry({ label: 'New space', type: 'room', status: 'active', sortOrder: spaces.length });
    onChange([...spaces, next]);
    setSelectedId(next.id);
    setQuery('');
  }

  function updateSelected(patch: Partial<HavenSpaceEntry>) {
    if (!selected) return;
    onChange(spaces.map((space) => space.id === selected.id ? { ...space, ...patch } : space));
  }

  function moveSelected(direction: -1 | 1) {
    if (!selected) return;
    const index = spaces.findIndex((space) => space.id === selected.id);
    const destination = index + direction;
    if (destination < 0 || destination >= spaces.length) return;
    const next = [...spaces];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next.map((space, sortOrder) => ({ ...space, sortOrder })));
  }

  function removeSelected() {
    if (!selected) return;
    const index = spaces.findIndex((space) => space.id === selected.id);
    const next = spaces.filter((space) => space.id !== selected.id).map((space, sortOrder) => ({ ...space, sortOrder }));
    onChange(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-foreground">Spaces</h3>
            <span className="text-xs text-muted-foreground">{spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Rooms, wings, facilities, grounds, and other named areas.</p>
        </div>
        <button type="button" onClick={addSpace} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4" /> Add space
        </button>
      </div>

      <label className="relative block">
        <span className="sr-only">Search spaces</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60" placeholder="Search spaces…" />
      </label>

      <div className="min-h-[26rem] overflow-hidden rounded-lg border border-border lg:grid lg:grid-cols-[minmax(14rem,0.8fr)_minmax(20rem,1.4fr)]">
        <div className="max-h-[20rem] overflow-y-auto border-b border-border bg-elevated/10 p-2 lg:max-h-[32rem] lg:border-b-0 lg:border-r">
          {filtered.length ? <ul className="space-y-1">
            {filtered.map((space) => <li key={space.id}>
              <button type="button" onClick={() => setSelectedId(space.id)} className={`w-full rounded px-3 py-2 text-left transition-colors ${selected?.id === space.id ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/60'}`}>
                <span className="block truncate text-sm font-medium">{space.label || 'Untitled space'}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatHavenSpaceTypeLabel(space.type)}</span>
                  {space.status !== 'active' ? <span>· {formatHavenSpaceStatusLabel(space.status)}</span> : null}
                </span>
              </button>
            </li>)}
          </ul> : <p className="px-3 py-6 text-center text-sm text-muted-foreground">No spaces match that search.</p>}
          <button type="button" onClick={addSpace} className="mt-2 inline-flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-primary hover:bg-primary/10"><Plus className="size-4" /> Add space</button>
        </div>

        <div className="p-4 sm:p-5">
          {selected ? <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">Selected space</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveSelected(-1)} disabled={spaces[0]?.id === selected.id} aria-label="Move space up" className="rounded border border-border p-1.5 hover:bg-muted disabled:opacity-30"><ChevronUp className="size-4" /></button>
                <button type="button" onClick={() => moveSelected(1)} disabled={spaces.at(-1)?.id === selected.id} aria-label="Move space down" className="rounded border border-border p-1.5 hover:bg-muted disabled:opacity-30"><ChevronDown className="size-4" /></button>
              </div>
            </div>
            <label className="block text-sm font-medium">Name<input autoFocus value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} className={fieldClass} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Type<select value={selected.type} onChange={(event) => updateSelected({ type: event.target.value as HavenSpaceType })} className={fieldClass}>{HAVEN_SPACE_TYPES.map((type) => <option key={type} value={type}>{formatHavenSpaceTypeLabel(type)}</option>)}</select></label>
              <label className="block text-sm font-medium">Status<select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as HavenSpaceStatus })} className={fieldClass}>{HAVEN_SPACE_STATUSES.map((status) => <option key={status} value={status}>{formatHavenSpaceStatusLabel(status)}</option>)}</select></label>
            </div>
            <label className="block text-sm font-medium">Description<textarea value={selected.description ?? ''} onChange={(event) => updateSelected({ description: event.target.value || null })} className={`${fieldClass} min-h-32 resize-y`} placeholder="What is this area like, and what is it used for?" /></label>
            <button type="button" onClick={removeSelected} className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline"><Trash2 className="size-4" /> Remove space</button>
          </div> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><p className="text-sm text-muted-foreground">Select a space to edit it, or add the first space.</p><button type="button" onClick={addSpace} className="mt-3 text-sm font-medium text-primary">Add space</button></div>}
        </div>
      </div>
    </section>
  );
}
