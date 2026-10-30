import { useEffect, useState, type ReactNode } from 'react';
import { normalizeFieldPageId, formatCustomFieldValue, type CharacterFieldDescriptor } from '@shared/characterPages';
import { fetchEntityFields, updateEntityField } from '@/lib/wiki';
import { EntityFactRow, EntityFactRowList, EntityWikiInfobox, ENTITY_FACT_EDIT_FIELD_CLASS } from './shells/EntityFactRow';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';

interface EntityCustomFieldsPanelProps {
  campaignHandle: string;
  entityPageId: string;
  activePageId: string | null;
  canEdit: boolean;
  refreshKey?: unknown;
  layout?: 'sidebox' | 'topbox';
  children?: ReactNode;
}

function FieldValue({ field, canEdit, onSave }: {
  field: CharacterFieldDescriptor;
  canEdit: boolean;
  onSave: (value: unknown) => Promise<void>;
}) {
  const valueToDraft = () => field.type === 'JSON' && field.value != null
    ? JSON.stringify(field.value, null, 2) : field.value == null ? '' : String(field.value);
  const [draft, setDraft] = useState(valueToDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setDraft(valueToDraft()); }, [field.value, field.type]);

  if (!canEdit || !field.capabilities.writable) {
    return <span className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{formatCustomFieldValue(field.value)}</span>;
  }
  const save = async () => {
    if (saving) return;
    setError(null);
    let value: unknown = draft;
    try {
      if (field.type === 'JSON') value = draft.trim() ? JSON.parse(draft) : null;
      else if (field.type === 'NUMBER') {
        value = draft.trim() === '' ? null : Number(draft);
        if (value !== null && !Number.isFinite(value)) throw new Error('Enter a valid number.');
      } else if (field.type === 'BOOLEAN') value = draft === '' ? null : draft === 'true';
      else if (field.type === 'DATE' || field.type === 'ENUM') value = draft || null;
      if (JSON.stringify(value) === JSON.stringify(field.value)) return;
      setSaving(true);
      await onSave(value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save field');
    } finally { setSaving(false); }
  };
  const common = {
    'aria-label': field.label,
    'aria-invalid': !!error,
    disabled: saving,
    value: draft,
    className: ENTITY_FACT_EDIT_FIELD_CLASS,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft(event.target.value),
    onBlur: () => void save(),
  };
  return (
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {field.type === 'JSON' ? <textarea {...common} rows={3} /> : field.type === 'BOOLEAN' ? (
        <select {...common}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
      ) : field.type === 'ENUM' ? (
        <select {...common}><option value="">Not set</option>{field.validation.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      ) : <input {...common} type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'} step={field.type === 'NUMBER' ? 'any' : undefined} />}
      {saving ? <span role="status" className="text-xs text-muted">Saving…</span> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

export function EntityCustomFieldsPanel({ campaignHandle, entityPageId, activePageId, canEdit, refreshKey, layout = 'sidebox', children }: EntityCustomFieldsPanelProps) {
  const [fields, setFields] = useState<CharacterFieldDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [boxLayout, setBoxLayout] = useState(layout);
  const preferenceKey = `esiana:field-box:${campaignHandle}:${entityPageId}:${normalizeFieldPageId(activePageId) ?? 'overview'}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      setBoxLayout(saved === 'topbox' || saved === 'sidebox' ? saved : layout);
    } catch { setBoxLayout(layout); }
  }, [preferenceKey, layout]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setFields([]);
    void fetchEntityFields(campaignHandle, entityPageId)
      .then((all) => { if (active) setFields(all.filter((field) => field.capabilities.readable && normalizeFieldPageId(field.pageId) === normalizeFieldPageId(activePageId))); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load custom fields'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activePageId, campaignHandle, entityPageId, refreshKey, retry]);

  const box = error ? (
    <div className="mb-4 text-sm text-destructive" role="alert"><p>{error}</p><button type="button" className="mt-2 text-primary" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
  ) : loading ? <p className="mb-4 text-sm text-muted" role="status">Loading custom fields…</p> : fields.length ? (
    <section aria-label="Custom fields" className="min-w-0">
      <EntityWikiInfobox className="w-full min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className={META_SECTION_LABEL_CLASS}>Information</h2>
          {canEdit ? <select aria-label="Information box layout" className="rounded border border-border bg-surface px-1 py-1 text-xs text-muted" value={boxLayout} onChange={(event) => {
            const next = event.target.value as 'sidebox' | 'topbox';
            setBoxLayout(next);
            try { localStorage.setItem(preferenceKey, next); } catch { /* View preferences are optional. */ }
          }}><option value="sidebox">Sidebox</option><option value="topbox">Topbox</option></select> : null}
        </div>
        <EntityFactRowList className="!max-w-none">
          {[...fields].sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt)).map((field) => (
            <EntityFactRow key={field.id} label={field.label}>
              <FieldValue field={field} canEdit={canEdit} onSave={async (value) => {
                const updated = await updateEntityField(campaignHandle, entityPageId, field.id, { value });
                setFields((current) => current.map((item) => item.id === updated.id ? updated : item));
              }} />
            </EntityFactRow>
          ))}
        </EntityFactRowList>
      </EntityWikiInfobox>
    </section>
  ) : null;
  const hasBox = !loading && !error && fields.length > 0;
  return (
    <div className={hasBox && boxLayout === 'sidebox' ? 'grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_20rem]' : 'min-w-0 space-y-4'} data-field-box-layout={boxLayout}>
      {box ? <div className={hasBox && boxLayout === 'sidebox' ? 'min-w-0 md:col-start-2 md:row-start-1' : 'min-w-0'}>{box}</div> : null}
      <div className={hasBox && boxLayout === 'sidebox' ? 'min-w-0 md:col-start-1 md:row-start-1' : 'min-w-0'}>{children}</div>
    </div>
  );
}
