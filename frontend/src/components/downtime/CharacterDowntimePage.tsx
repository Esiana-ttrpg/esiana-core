import { useCallback, useEffect, useState } from 'react';
import type { DowntimePersonLine } from '@shared/downtimeHub';
import { fetchDowntimePersonByCharacter } from '@/lib/downtime';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AddDowntimePersonModal } from './AddDowntimePersonModal';

type AssignmentOptions = { havens: Array<{ id: string; label: string }>; projects: Array<{ id: string; label: string }> };

export function CharacterDowntimePage({ campaignHandle, characterPageId }: { campaignHandle: string; characterPageId: string }) {
  const [person, setPerson] = useState<DowntimePersonLine | null>(null);
  const [options, setOptions] = useState<AssignmentOptions>({ havens: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const payload = await fetchDowntimePersonByCharacter(campaignHandle, characterPageId); setPerson(payload.person); setOptions(payload.assignmentOptions); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load Hireling details.'); setPerson(null); }
    finally { setLoading(false); }
  }, [campaignHandle, characterPageId]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <LoadingSpinner label="Loading Downtime…" />;
  if (error || !person) return <p className="rounded-lg border border-border bg-elevated/20 p-4 text-sm text-muted">{error ?? 'No Hireling relationship is available.'}</p>;
  return <div className="mx-auto w-full max-w-3xl space-y-6 py-4">
    <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-muted">Hireling</p><h2 className="text-xl font-semibold">Downtime</h2></div>{person.canEdit ? <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40" onClick={() => setEditing(true)}>Edit hireling</button> : null}</div>
    <dl className="grid gap-5 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-muted">Role</dt><dd className="mt-1">{person.role ?? '—'}</dd></div><div><dt className="text-xs uppercase tracking-wide text-muted">Status</dt><dd className="mt-1 capitalize">{person.status.toLowerCase()}</dd></div><div><dt className="text-xs uppercase tracking-wide text-muted">Assignment</dt><dd className="mt-1">{person.assignment?.label ?? 'Unassigned'}</dd></div><div><dt className="text-xs uppercase tracking-wide text-muted">Compensation</dt><dd className="mt-1">{person.compensation.label}</dd></div></dl>
    {person.features.length > 0 ? <section><h3 className="font-semibold">Features</h3><div className="mt-3 space-y-2">{person.features.map((feature) => <div key={feature.id} className="rounded-lg border border-border bg-elevated/20 p-4"><p className="font-medium">{feature.title}</p>{feature.description ? <p className="mt-1 text-sm text-muted">{feature.description}</p> : null}</div>)}</div></section> : null}
    {person.notes ? <section><h3 className="font-semibold">Notes</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{person.notes}</p></section> : null}
    <AddDowntimePersonModal open={editing} editing={person} campaignHandle={campaignHandle} characters={[]} havens={options.havens} projects={options.projects} onClose={() => setEditing(false)} onSaved={() => void load()} />
  </div>;
}
