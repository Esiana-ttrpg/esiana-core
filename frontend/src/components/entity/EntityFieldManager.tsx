import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import type { CharacterFieldDescriptor, CharacterFieldType, CharacterPageDescriptor } from '@shared/characterPages';
import {
  createCustomEntityField,
  deleteCustomEntityField,
  fetchEntityFields,
  updateEntityField,
} from '@/lib/wiki';
import { characterResourceSourceLabel } from '@/lib/characterResourceProvenance';

interface EntityFieldManagerProps {
  campaignHandle: string;
  entityPageId: string;
  pages: CharacterPageDescriptor[];
  onClose: () => void;
}

const FIELD_TYPES: Array<{ value: CharacterFieldType; label: string }> = [
  { value: 'STRING', label: 'Text' }, { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes / no' }, { value: 'DATE', label: 'Date' },
  { value: 'JSON', label: 'Structured data' },
];

export function EntityFieldManager({ campaignHandle, entityPageId, pages, onClose }: EntityFieldManagerProps) {
  const [fields, setFields] = useState<CharacterFieldDescriptor[]>([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CharacterFieldType>('STRING');
  const [pageId, setPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const reloadFields = useCallback(async () => {
    const current = await fetchEntityFields(campaignHandle, entityPageId);
    setFields(current);
    return current;
  }, [campaignHandle, entityPageId]);

  useEffect(() => {
    let active = true;
    void fetchEntityFields(campaignHandle, entityPageId).then((next) => { if (active) setFields(next); }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'Unable to load fields');
    });
    return () => { active = false; };
  }, [campaignHandle, entityPageId]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const ordered = [...fields].sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt));
  const change = async (field: CharacterFieldDescriptor, patch: Parameters<typeof updateEntityField>[3]) => {
    try {
      const updated = await updateEntityField(campaignHandle, entityPageId, field.id, patch);
      setFields((current) => current.map((candidate) => candidate.id === field.id ? updated : candidate));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update field');
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const normalized = next.map((field, position) => ({ ...field, displayOrder: position * 10 }));
    setFields(normalized);
    setMoving(true);
    setError(null);
    try {
      await Promise.all(normalized
        .filter((field) => field.capabilities.writable)
        .map((field) => updateEntityField(campaignHandle, entityPageId, field.id, { displayOrder: field.displayOrder })));
      await reloadFields();
    } catch (reason) {
      try { await reloadFields(); } catch { /* retain the persistence error below */ }
      setError(reason instanceof Error ? reason.message : 'Unable to reorder fields; the server order was reloaded');
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="manage-entity-fields-title">
      <div ref={dialogRef} className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="manage-entity-fields-title" className="text-lg font-semibold text-foreground">Manage custom fields</h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-foreground" aria-label="Close manage fields"><X className="size-4" /></button>
        </div>
        <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          if (!label.trim()) return;
          void createCustomEntityField(campaignHandle, entityPageId, { label: label.trim(), type, pageId: pageId ?? undefined }).then((field) => {
            setFields((current) => [...current, field]); setLabel(''); setError(null);
          }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to add field'));
        }}>
          <label className="min-w-48 flex-1 text-xs text-muted">Field name<input className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} /></label>
          <label className="text-xs text-muted">Type<select className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={type} onChange={(event) => setType(event.target.value as CharacterFieldType)}>{FIELD_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-xs text-muted">Page<select className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={pageId ?? ''} onChange={(event) => setPageId(event.target.value || null)}><option value="">Overview</option>{pages.filter((page) => page.coreKey !== 'overview' && !page.id.startsWith('virtual:')).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label>
          <button type="submit" className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground"><Plus className="size-4" /> Add field</button>
        </form>
        {error ? <p className="mb-3 text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="space-y-1">
          {ordered.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
              <div className="min-w-40 flex-1"><input className="w-full bg-transparent text-sm font-medium text-foreground" defaultValue={field.label} disabled={!field.capabilities.deletable} onBlur={(event) => { const next = event.target.value.trim(); if (next && next !== field.label) void change(field, { label: next }); }} /><p className="text-xs text-muted">{characterResourceSourceLabel(field)} · {field.type.toLowerCase()}</p></div>
              <select className="rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground" value={field.pageId ?? ''} disabled={!field.capabilities.deletable} onChange={(event) => void change(field, { pageId: event.target.value || null })}><option value="">Overview</option>{pages.filter((page) => page.coreKey !== 'overview' && !page.id.startsWith('virtual:')).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select>
              {field.capabilities.deletable ? <><button type="button" className="rounded p-1 text-muted disabled:opacity-30" disabled={moving || index === 0} onClick={() => void move(index, -1)} aria-label={`Move ${field.label} earlier`}><ArrowUp className="size-4" /></button><button type="button" className="rounded p-1 text-muted disabled:opacity-30" disabled={moving || index === ordered.length - 1} onClick={() => void move(index, 1)} aria-label={`Move ${field.label} later`}><ArrowDown className="size-4" /></button><button type="button" className="rounded p-1 text-muted hover:text-destructive" aria-label={`Delete ${field.label}`} onClick={() => { if (!window.confirm(`Delete “${field.label}”?`)) return; void deleteCustomEntityField(campaignHandle, entityPageId, field.id).then(() => { setFields((current) => current.filter((candidate) => candidate.id !== field.id)); setError(null); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : `Unable to delete ${field.label}`)); }}><Trash2 className="size-4" /></button></> : null}
            </div>
          ))}
          {ordered.length === 0 ? <p className="py-6 text-center text-sm text-muted">No custom fields yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
