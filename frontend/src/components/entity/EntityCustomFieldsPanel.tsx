import { useEffect, useState } from 'react';
import type { CharacterFieldDescriptor } from '@shared/characterPages';
import { fetchEntityFields, updateEntityField } from '@/lib/wiki';

interface EntityCustomFieldsPanelProps {
  campaignHandle: string;
  entityPageId: string;
  activePageId: string | null;
  canEdit: boolean;
}

export function EntityCustomFieldsPanel({ campaignHandle, entityPageId, activePageId, canEdit }: EntityCustomFieldsPanelProps) {
  const [fields, setFields] = useState<CharacterFieldDescriptor[]>([]);
  useEffect(() => {
    void fetchEntityFields(campaignHandle, entityPageId).then((all) => setFields(all.filter((field) => field.pageId === activePageId)));
  }, [activePageId, campaignHandle, entityPageId]);
  if (fields.length === 0) return null;

  return (
    <section className="mt-6 border-t border-border/40 pt-4" aria-label="Custom fields">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.sort((a, b) => a.displayOrder - b.displayOrder).map((field) => (
          <label key={field.id} className="text-xs text-muted">
            {field.label}
            {field.type === 'BOOLEAN' ? (
              <input className="ml-2 align-middle" type="checkbox" checked={field.value === true} disabled={!canEdit || !field.capabilities.writable} onChange={(event) => void updateEntityField(campaignHandle, entityPageId, field.id, { value: event.target.checked }).then((updated) => setFields((current) => current.map((item) => item.id === updated.id ? updated : item)))} />
            ) : (
              <input className="mt-1 block w-full rounded-md border border-border/50 bg-background px-2 py-1.5 text-sm text-foreground disabled:border-transparent disabled:px-0" type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'} value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : field.value == null ? '' : JSON.stringify(field.value)} disabled={!canEdit || !field.capabilities.writable} onBlur={(event) => { const raw = event.target.value; let value: unknown = raw; if (field.type === 'NUMBER') value = raw === '' ? null : Number(raw); else if (field.type === 'JSON') { try { value = JSON.parse(raw || 'null'); } catch { return; } } void updateEntityField(campaignHandle, entityPageId, field.id, { value }).then((updated) => setFields((current) => current.map((item) => item.id === updated.id ? updated : item))); }} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}
