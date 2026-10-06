import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DowntimeHubPeoplePayload, DowntimePersonLine } from '@shared/downtimeHub';
import { updateDowntimePerson } from '@/lib/downtime';
import { AddDowntimePersonModal } from './AddDowntimePersonModal';

function QuickAssignmentSelect({ person, data, campaignHandle, onChanged }: { person: DowntimePersonLine; data: DowntimeHubPeoplePayload; campaignHandle: string; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = person.assignment ? `${person.assignment.kind}:${person.assignment.id}` : '';

  async function assign(nextAssignment: string) {
    const [kind, id] = nextAssignment.split(':');
    setSaving(true);
    setError(null);
    try {
      await updateDowntimePerson(campaignHandle, person.id, {
        havenId: kind === 'haven' ? id : null,
        projectId: kind === 'project' ? id : null,
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update assignment.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-w-48">
    <select
      aria-label={`Assignment for ${person.characterName}`}
      className="w-full rounded-lg border border-border bg-canvas px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      value={value}
      disabled={saving || person.status !== 'ACTIVE'}
      onChange={(event) => void assign(event.target.value)}
    >
      <option value="">Unassigned</option>
      <optgroup label="Havens">{data.assignmentOptions.havens.map((item) => <option key={item.id} value={`haven:${item.id}`}>{item.label}</option>)}</optgroup>
      <optgroup label="Projects">{data.assignmentOptions.projects.map((item) => <option key={item.id} value={`project:${item.id}`}>{item.label}</option>)}</optgroup>
    </select>
    {saving ? <span className="mt-1 block text-xs text-muted">Assigning…</span> : null}
    {error ? <span className="mt-1 block text-xs text-danger" role="alert">{error}</span> : null}
  </div>;
}

export function DowntimePeopleSection({ data, campaignHandle, onChanged }: { data: DowntimeHubPeoplePayload; campaignHandle: string; onChanged: () => void }) {
  const [editing, setEditing] = useState<DowntimePersonLine | null>(null);
  if (data.people.length === 0) return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">No hirelings yet.</div>;
  return <div className="space-y-4">
    <p className="text-sm text-muted">{data.summary.active} active · {data.summary.assignedToProjects} assigned to projects · {data.summary.assignedToHavens} assigned to havens</p>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b border-border text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Assignment</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{data.people.map((person) => <tr key={person.id} className="border-b border-border/70 last:border-0">
        <td className="px-4 py-3 font-medium"><Link className="text-primary hover:underline" to={person.characterHref}>{person.characterName}</Link></td>
        <td className="px-4 py-3 text-muted">{person.role ?? '—'}</td>
        <td className="px-4 py-3">{person.canEdit
          ? <div className="space-y-1.5">
              <QuickAssignmentSelect person={person} data={data} campaignHandle={campaignHandle} onChanged={onChanged} />
              {person.assignment
                ? <Link className="block text-xs text-primary hover:underline" to={person.assignment.href}>View {person.assignment.label}</Link>
                : <span className="block text-xs text-muted">Unassigned</span>}
            </div>
          : person.assignment ? <Link className="hover:underline" to={person.assignment.href}>{person.assignment.label}</Link> : <span className="text-muted">Unassigned</span>}</td>
        <td className="px-4 py-3 text-muted">{person.compensation.label}</td><td className="px-4 py-3 capitalize">{person.status.toLowerCase()}</td>
        <td className="px-4 py-3 text-right">{person.canEdit ? <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditing(person)}>Edit</button> : null}</td>
      </tr>)}</tbody>
    </table></div>
    <AddDowntimePersonModal open={editing != null} editing={editing} campaignHandle={campaignHandle} characters={[]} havens={data.assignmentOptions.havens} projects={data.assignmentOptions.projects} onClose={() => setEditing(null)} onSaved={onChanged} />
  </div>;
}
