import { Link } from 'react-router-dom';
import type { DowntimePersonLine } from '@shared/downtimeHub';

export function AssignedPeopleSection({ people, title }: { people: DowntimePersonLine[]; title: string }) {
  if (people.length === 0) return null;
  return <section>
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-elevated/20">
      {people.map((person) => <div key={person.id} className="flex items-center justify-between gap-4 px-4 py-3">
        <Link to={person.characterHref} className="font-medium text-primary hover:underline">{person.characterName}</Link>
        <span className="text-sm text-muted-foreground">{person.role ?? ({ HIRELING: 'Hireling', FOLLOWER: 'Follower', MEMBER: 'Member' } as const)[person.relationshipType]}</span>
      </div>)}
    </div>
  </section>;
}
