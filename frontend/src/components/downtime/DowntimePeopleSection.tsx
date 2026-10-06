import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DowntimeHubPeoplePayload, DowntimePersonLine } from '@shared/downtimeHub';
import { AddDowntimePersonModal } from './AddDowntimePersonModal';

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
        <td className="px-4 py-3">{person.assignment ? <Link className="hover:underline" to={person.assignment.href}>{person.assignment.label}</Link> : <span className="text-muted">Unassigned</span>}</td>
        <td className="px-4 py-3 text-muted">{person.compensation.label}</td><td className="px-4 py-3 capitalize">{person.status.toLowerCase()}</td>
        <td className="px-4 py-3 text-right">{person.canEdit ? <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditing(person)}>Edit</button> : null}</td>
      </tr>)}</tbody>
    </table></div>
    <AddDowntimePersonModal open={editing != null} editing={editing} campaignHandle={campaignHandle} characters={[]} havens={data.assignmentOptions.havens} projects={data.assignmentOptions.projects} onClose={() => setEditing(null)} onSaved={onChanged} />
  </div>;
}
