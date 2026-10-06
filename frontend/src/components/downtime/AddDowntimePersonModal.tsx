import { useEffect, useState } from 'react';
import type { DowntimePersonLine } from '@shared/downtimeHub';
import { createDowntimePerson, updateDowntimePerson } from '@/lib/downtime';

type Option = { id: string; label: string };
type Props = { open: boolean; campaignHandle: string; characters: Option[]; havens: Option[]; projects: Option[]; editing?: DowntimePersonLine | null; onClose: () => void; onSaved: () => void };

export function AddDowntimePersonModal({ open, campaignHandle, characters, havens, projects, editing = null, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [name, setName] = useState('');
  const [characterPageId, setCharacterPageId] = useState('');
  const [role, setRole] = useState('');
  const [assignment, setAssignment] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'FORMER'>('ACTIVE');
  const [addHirelingTag, setAddHirelingTag] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('gold');
  const [cadence, setCadence] = useState('MONTHLY');
  const [features, setFeatures] = useState<Array<{ id: string; title: string; description: string | null }>>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRole(editing?.role ?? '');
    setAssignment(editing?.assignment ? `${editing.assignment.kind}:${editing.assignment.id}` : '');
    setStatus(editing?.status ?? 'ACTIVE');
    setAmount(editing?.compensation.amount == null ? '' : String(editing.compensation.amount));
    setCurrency(editing?.compensation.currency ?? 'gold');
    setCadence(editing?.compensation.cadence ?? 'MONTHLY');
    setAddHirelingTag(false);
    setFeatures(editing?.features ?? []);
    setNotes(editing?.notes ?? '');
  }, [open, editing]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    const [assignmentKind, assignmentId] = assignment.split(':');
    const common = { role, havenId: assignmentKind === 'haven' ? assignmentId : null, projectId: assignmentKind === 'project' ? assignmentId : null, compensationAmount: amount ? Number(amount) : undefined, compensationCurrency: amount ? currency : undefined, compensationCadence: amount ? cadence : undefined, features, notes };
    try {
      if (editing) await updateDowntimePerson(campaignHandle, editing.id, { ...common, status });
      else await createDowntimePerson(campaignHandle, { ...common, characterName: mode === 'create' ? name : undefined, characterPageId: mode === 'link' ? characterPageId : undefined, relationshipType: 'HIRELING', addHirelingTag });
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save hireling.'); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-surface p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label={editing ? 'Edit hireling' : 'Add hireling'}>
      <h2 className="text-lg font-semibold">{editing ? `Edit ${editing.characterName}` : 'Add hireling'}</h2>
      {editing ? <div className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2"><span className="font-medium">{editing.characterName}</span><a href={editing.characterHref} className="text-sm text-primary hover:underline">View character →</a></div> : null}
      {!editing ? <><div className="flex gap-4 text-sm"><label><input type="radio" checked={mode === 'create'} onChange={() => setMode('create')} /> Create character</label><label><input type="radio" checked={mode === 'link'} onChange={() => setMode('link')} /> Link existing character</label></div>{mode === 'create' ? <label className="block text-sm">Name<input required className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} /></label> : <label className="block text-sm">Character<select required className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={characterPageId} onChange={(event) => setCharacterPageId(event.target.value)}><option value="">Choose a character…</option>{characters.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}</> : null}
      <label className="block text-sm">Role<input className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" placeholder="Steward, guide, guild member…" value={role} onChange={(event) => setRole(event.target.value)} /></label>
      <label className="block text-sm">Primary assignment<select className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={assignment} onChange={(event) => setAssignment(event.target.value)}><option value="">Unassigned</option><optgroup label="Havens">{havens.map((item) => <option key={item.id} value={`haven:${item.id}`}>{item.label}</option>)}</optgroup><optgroup label="Projects">{projects.map((item) => <option key={item.id} value={`project:${item.id}`}>{item.label}</option>)}</optgroup></select></label>
      {editing ? <label className="block text-sm">Status<select className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="FORMER">Former</option></select></label> : null}
      <div className="grid grid-cols-3 gap-2"><label className="text-sm">Amount<input type="number" min="0" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="text-sm">Currency<input className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={currency} onChange={(event) => setCurrency(event.target.value)} /></label><label className="text-sm">Cadence<select className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2" value={cadence} onChange={(event) => setCadence(event.target.value)}><option value="MONTHLY">Monthly</option><option value="SEASONAL">Seasonal</option><option value="ONE_TIME">One-time</option></select></label></div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Features</legend>{features.map((feature, index) => <div key={feature.id} className="rounded-lg border border-border bg-canvas p-3"><div className="flex gap-2"><input aria-label="Feature title" className="min-w-0 flex-1 bg-transparent font-medium outline-none" value={feature.title} onChange={(event) => setFeatures((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /><button type="button" className="text-muted hover:text-destructive" aria-label={`Remove ${feature.title || 'feature'}`} onClick={() => setFeatures((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div><textarea aria-label="Feature description" className="mt-2 min-h-16 w-full resize-y bg-transparent text-sm text-muted outline-none" placeholder="Optional description" value={feature.description ?? ''} onChange={(event) => setFeatures((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value || null } : item))} /></div>)}<button type="button" className="text-sm text-primary hover:underline" onClick={() => setFeatures((current) => [...current, { id: `feature-${Date.now()}`, title: '', description: null }])}>+ Add feature</button></fieldset>
      <label className="block text-sm">Notes<textarea className="mt-1 min-h-24 w-full resize-y rounded-lg border border-border bg-canvas px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {!editing ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={addHirelingTag} onChange={(event) => setAddHirelingTag(event.target.checked)} /><span>Add the <strong>Hireling</strong> Character tag for discovery. This optional tag does not control Hireling status.</span></label> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2"><button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={onClose}>Cancel</button><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save' : 'Add'}</button></div>
    </form>
  </div>;
}
