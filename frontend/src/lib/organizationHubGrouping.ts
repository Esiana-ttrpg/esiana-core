import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { ORGANIZATION_WORLD_STATE_LABELS } from '@/lib/organizationMetadata';
import type { CategoryIndexChild } from '@/lib/wiki';

export type OrganizationGroupMode = 'hierarchy' | 'world-state' | 'region' | 'table';

export interface OrganizationHubSection {
  label: string;
  entries: CategoryIndexChild[];
}

function sortByTitle(entries: CategoryIndexChild[]): CategoryIndexChild[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

function groupByHierarchy(children: CategoryIndexChild[]): OrganizationHubSection[] {
  const childIds = new Set<string>();
  for (const child of children) {
    const parentId = parseOrganizationMetadata(child.metadata).parentOrgId;
    if (parentId) childIds.add(child.id);
  }

  const roots = children.filter((child) => {
    const parentId = parseOrganizationMetadata(child.metadata).parentOrgId;
    return !parentId || !children.some((c) => c.id === parentId);
  });

  const sections: OrganizationHubSection[] = [];

  for (const root of sortByTitle(roots)) {
    const directChildren = sortByTitle(
      children.filter(
        (c) => parseOrganizationMetadata(c.metadata).parentOrgId === root.id,
      ),
    );
    sections.push({
      label: root.title,
      entries: [root, ...directChildren],
    });
  }

  const orphans = sortByTitle(
    children.filter(
      (c) =>
        !roots.some((r) => r.id === c.id) &&
        !sections.some((s) => s.entries.some((e) => e.id === c.id)),
    ),
  );

  if (orphans.length > 0) {
    sections.push({ label: 'Other organizations', entries: orphans });
  }

  return sections;
}

function groupByField(
  children: CategoryIndexChild[],
  resolveKey: (child: CategoryIndexChild) => string,
  unknownLabel: string,
): OrganizationHubSection[] {
  const buckets = new Map<string, CategoryIndexChild[]>();
  for (const child of children) {
    const key = resolveKey(child) || unknownLabel;
    const list = buckets.get(key) ?? [];
    list.push(child);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, entries]) => ({ label, entries: sortByTitle(entries) }));
}

export function groupOrganizations(
  children: CategoryIndexChild[],
  mode: OrganizationGroupMode,
): OrganizationHubSection[] {
  if (mode === 'table') {
    return [{ label: '', entries: sortByTitle(children) }];
  }
  if (mode === 'world-state') {
    return groupByField(
      children,
      (child) => {
        const ws = parseOrganizationMetadata(child.metadata).worldState;
        return ws ? ORGANIZATION_WORLD_STATE_LABELS[ws] : '';
      },
      'Unknown state',
    );
  }
  if (mode === 'region') {
    return groupByField(
      children,
      (child) => parseOrganizationMetadata(child.metadata).region ?? '',
      'Unknown region',
    );
  }
  return groupByHierarchy(children);
}
