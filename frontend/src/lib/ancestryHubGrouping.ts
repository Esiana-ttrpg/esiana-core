import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import { childLineagesOf } from '@/lib/entityProjectionQueries';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import type { CategoryIndexChild } from '@/lib/wiki';

export type AncestryGroupMode = 'taxonomy' | 'homelands' | 'table';

export interface AncestryTaxonomyGroup {
  root: CategoryIndexChild;
  lineages: CategoryIndexChild[];
}

export interface AncestryHubSection {
  label: string;
  homelandRegionId: string | null;
  taxonomyGroups: AncestryTaxonomyGroup[];
  entries: CategoryIndexChild[];
}

const UNKNOWN_HOMELAND = 'Unknown Homeland';

function sortByTitle(entries: CategoryIndexChild[]): CategoryIndexChild[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

function toSnapshots(children: CategoryIndexChild[]): WikiPageLineageSnapshot[] {
  return children.map((child) => ({
    id: child.id,
    title: child.title,
    templateType: 'DEFAULT',
    metadata: child.metadata,
  }));
}

function resolveHomelandKey(
  child: CategoryIndexChild,
  titleById: Map<string, string>,
): { key: string; regionId: string | null } {
  const meta = parseAncestryMetadata(child.metadata);
  const firstId = meta.homelandRegionIds[0] ?? null;
  if (firstId) {
    return {
      key: titleById.get(firstId) ?? firstId,
      regionId: firstId,
    };
  }
  const legacy = meta.homeland?.trim() || meta.region?.trim();
  return {
    key: legacy || UNKNOWN_HOMELAND,
    regionId: null,
  };
}

function groupByHomelands(
  children: CategoryIndexChild[],
  titleById: Map<string, string>,
): AncestryHubSection[] {
  const buckets = new Map<
    string,
    { regionId: string | null; entries: CategoryIndexChild[] }
  >();

  for (const child of children) {
    const { key, regionId } = resolveHomelandKey(child, titleById);
    const bucket = buckets.get(key) ?? { regionId, entries: [] };
    bucket.entries.push(child);
    buckets.set(key, bucket);
  }

  const sections: AncestryHubSection[] = [...buckets.entries()].map(
    ([label, { regionId, entries }]) => ({
      label,
      homelandRegionId: regionId,
      taxonomyGroups: [],
      entries: sortByTitle(entries),
    }),
  );

  sections.sort((a, b) => {
    if (a.label === UNKNOWN_HOMELAND) return 1;
    if (b.label === UNKNOWN_HOMELAND) return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });

  return sections;
}

function groupByTaxonomy(children: CategoryIndexChild[]): AncestryHubSection[] {
  const snapshots = toSnapshots(children);
  const childIds = new Set(children.map((child) => child.id));
  const childById = new Map(children.map((child) => [child.id, child]));
  const assignedLineageIds = new Set<string>();

  const roots: CategoryIndexChild[] = [];
  for (const child of children) {
    const meta = parseAncestryMetadata(child.metadata);
    if (
      meta.entityKind === 'lineage' &&
      meta.parentAncestryId &&
      childIds.has(meta.parentAncestryId)
    ) {
      continue;
    }
    roots.push(child);
  }

  const sections: AncestryHubSection[] = [];

  for (const root of sortByTitle(roots)) {
    const lineageSnapshots = childLineagesOf(root.id, snapshots);
    const lineages = sortByTitle(
      lineageSnapshots
        .map((snapshot) => childById.get(snapshot.id))
        .filter((entry): entry is CategoryIndexChild => Boolean(entry)),
    );

    for (const lineage of lineages) {
      assignedLineageIds.add(lineage.id);
    }

    sections.push({
      label: root.title,
      homelandRegionId:
        parseAncestryMetadata(root.metadata).homelandRegionIds[0] ?? null,
      taxonomyGroups: [{ root, lineages }],
      entries: [root, ...lineages],
    });
  }

  const orphanLineages = sortByTitle(
    children.filter((child) => {
      const meta = parseAncestryMetadata(child.metadata);
      return (
        meta.entityKind === 'lineage' &&
        !assignedLineageIds.has(child.id) &&
        !roots.some((root) => root.id === child.id)
      );
    }),
  );

  for (const orphan of orphanLineages) {
    sections.push({
      label: orphan.title,
      homelandRegionId:
        parseAncestryMetadata(orphan.metadata).homelandRegionIds[0] ?? null,
      taxonomyGroups: [{ root: orphan, lineages: [] }],
      entries: [orphan],
    });
  }

  return sections;
}

export function groupAncestries(
  children: CategoryIndexChild[],
  mode: AncestryGroupMode,
  titleById: Map<string, string> = new Map(),
): AncestryHubSection[] {
  if (mode === 'table') {
    return [
      {
        label: '',
        homelandRegionId: null,
        taxonomyGroups: [],
        entries: sortByTitle(children),
      },
    ];
  }

  if (mode === 'homelands') {
    return groupByHomelands(children, titleById);
  }

  return groupByTaxonomy(children);
}
