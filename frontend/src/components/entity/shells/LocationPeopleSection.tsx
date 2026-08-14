import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { LocationPersonEntry } from '@/lib/locationHubProjection';
import type { WikiTreeNode } from '@/types/wiki';

interface LocationPeopleSectionProps {
  title: string;
  entries: LocationPersonEntry[];
  campaignHandle: string;
  flatPages: readonly WikiTreeNode[];
  emptyHint?: string;
}

function groupEntries(entries: LocationPersonEntry[]): Array<{
  groupId: string | null;
  groupTitle: string | null;
  members: LocationPersonEntry[];
}> {
  const ungrouped: LocationPersonEntry[] = [];
  const byGroup = new Map<string, LocationPersonEntry[]>();
  const groupTitles = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.groupEntityId) {
      ungrouped.push(entry);
      continue;
    }
    const list = byGroup.get(entry.groupEntityId) ?? [];
    list.push(entry);
    byGroup.set(entry.groupEntityId, list);
    if (entry.groupEntityTitle) {
      groupTitles.set(entry.groupEntityId, entry.groupEntityTitle);
    }
  }

  const groups: Array<{
    groupId: string | null;
    groupTitle: string | null;
    members: LocationPersonEntry[];
  }> = [];

  for (const [groupId, members] of byGroup) {
    groups.push({
      groupId,
      groupTitle: groupTitles.get(groupId) ?? null,
      members,
    });
  }
  groups.sort((a, b) =>
    (a.groupTitle ?? '').localeCompare(b.groupTitle ?? '', undefined, {
      sensitivity: 'base',
    }),
  );

  if (ungrouped.length > 0) {
    groups.push({ groupId: null, groupTitle: null, members: ungrouped });
  }

  return groups;
}

export function LocationPeopleSection({
  title,
  entries,
  campaignHandle,
  flatPages,
  emptyHint,
}: LocationPeopleSectionProps) {
  if (entries.length === 0) return null;

  const grouped = groupEntries(entries);

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <div className="space-y-3">
        {grouped.map((group) => (
          <div key={group.groupId ?? 'ungrouped'} className="space-y-1">
            {group.groupId && group.groupTitle ? (
              <Link
                to={campaignWikiPath(campaignHandle, group.groupId, flatPages)}
                className="text-[11px] font-medium text-primary/90 hover:underline"
              >
                {group.groupTitle}
              </Link>
            ) : null}
            <ul className="space-y-1">
              {group.members.map((person) => (
                <li key={person.characterId} className="flex flex-wrap items-center gap-2">
                  <Link
                    to={campaignWikiPath(campaignHandle, person.characterId, flatPages)}
                    className="text-sm text-foreground hover:text-primary"
                  >
                    {person.title}
                  </Link>
                  {person.featured ? (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      Featured
                    </span>
                  ) : null}
                  {person.missingBadge ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                      Missing
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {emptyHint ? null : undefined}
    </section>
  );
}

export function LocationPeopleTabEmpty({ hint }: { hint: string }) {
  return <p className="text-sm text-muted">{hint}</p>;
}
