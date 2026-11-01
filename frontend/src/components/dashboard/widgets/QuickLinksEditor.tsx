import { useState } from 'react';
import {
  DASHBOARD_EXTERNAL_LINK_ICONS, DASHBOARD_QUICK_LINK_MAX, normalizeDashboardExternalUrl,
  type DashboardExternalLinkIcon, type DashboardQuickLinkEntry, type DashboardQuickLinkKey,
} from '@shared/dashboardQuickLinkCatalog';

interface Props {
  entries: DashboardQuickLinkEntry[];
  internalLabel: (key: DashboardQuickLinkKey) => string;
  onChange: (entries: DashboardQuickLinkEntry[]) => void;
}

export function QuickLinksEditor({ entries, internalLabel, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState<DashboardExternalLinkIcon>('link');
  const [error, setError] = useState('');
  const field = 'w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground';
  const action = 'rounded-md px-2 py-2 text-xs hover:bg-elevated disabled:opacity-40';

  function move(index: number, direction: number) {
    const next = [...entries];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function reset() { setEditingId(null); setLabel(''); setUrl(''); setIcon('link'); setError(''); }

  function save() {
    const normalized = normalizeDashboardExternalUrl(url);
    if (!label.trim() || label.trim().length > 80) { setError('Enter a label of 1–80 characters.'); return; }
    if (!normalized) { setError('Enter a complete HTTP or HTTPS URL without credentials.'); return; }
    if (!editingId && entries.length >= DASHBOARD_QUICK_LINK_MAX) { setError(`Remove a link before adding another (maximum ${DASHBOARD_QUICK_LINK_MAX}).`); return; }
    const entry = { kind: 'external' as const, id: editingId ?? (globalThis.crypto?.randomUUID?.() ?? `resource-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`), label: label.trim(), url: normalized, icon };
    onChange(editingId ? entries.map(item => typeof item !== 'string' && item.id === editingId ? entry : item) : [...entries, entry]);
    reset();
  }

  return <div className="space-y-3">
    <ol aria-label="Quick link order" className="space-y-2">
      {entries.map((entry, index) => {
        const name = typeof entry === 'string' ? internalLabel(entry) : entry.label;
        return <li key={typeof entry === 'string' ? `${entry}-${index}` : entry.id} className="rounded-md bg-elevated/40 px-2 py-2">
          <p className="break-words text-sm font-medium text-foreground">{name}</p>
          {typeof entry !== 'string' ? <p className="break-all text-xs text-muted">{entry.url}</p> : null}
          <div className="flex flex-wrap text-muted">
            <button type="button" className={action} aria-label={`Move ${name} earlier`} disabled={index === 0} onClick={() => move(index, -1)}>Earlier</button>
            <button type="button" className={action} aria-label={`Move ${name} later`} disabled={index === entries.length - 1} onClick={() => move(index, 1)}>Later</button>
            {typeof entry !== 'string' ? <button type="button" className={action} aria-label={`Edit ${name}`} onClick={() => {
              setEditingId(entry.id); setLabel(entry.label); setUrl(entry.url); setIcon(entry.icon ?? 'link'); setError('');
            }}>Edit</button> : null}
            <button type="button" className={action} aria-label={`Remove ${name}`} onClick={() => {
              onChange(entries.filter((_, itemIndex) => itemIndex !== index));
              if (typeof entry !== 'string' && entry.id === editingId) reset();
            }}>Remove</button>
          </div>
        </li>;
      })}
    </ol>
    <form aria-label={editingId ? 'Edit external resource' : 'Add external resource'} className="space-y-2 border-t border-border/30 pt-3" onSubmit={event => { event.preventDefault(); save(); }}>
      <label className="block text-xs text-muted">Display label<input className={field} value={label} maxLength={80} onChange={event => setLabel(event.target.value)} required /></label>
      <label className="block text-xs text-muted">External URL<input className={field} value={url} maxLength={2048} onChange={event => setUrl(event.target.value)} placeholder="https://example.com/resource" required /></label>
      <label className="block text-xs text-muted">Icon<select className={field} value={icon} onChange={event => setIcon(event.target.value as DashboardExternalLinkIcon)}>
        {DASHBOARD_EXTERNAL_LINK_ICONS.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">{editingId ? 'Save resource' : 'Add external resource'}</button>
        {editingId ? <button type="button" className={action} onClick={reset}>Cancel edit</button> : null}
      </div>
    </form>
  </div>;
}
