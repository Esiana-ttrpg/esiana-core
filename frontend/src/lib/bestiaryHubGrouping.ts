import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  buildBestiarySectionPresence,
  type BestiarySectionThreatPresence,
} from '@/lib/bestiaryBrowseProjection';
import { resolveCreatureEnvironmentTint } from '@/lib/bestiaryIdentityProjection';

export type BestiaryGroupMode = 'habitat' | 'type';

export interface BestiaryHabitatSection {
  label: string;
  envTint: 'frost' | 'swamp' | 'volcanic' | 'default';
  entries: CategoryIndexChild[];
  presence: BestiarySectionThreatPresence;
}

const UNKNOWN_RANGE = 'Unknown Range';
const UNKNOWN_KIND = 'Uncategorized';

function resolveGroupKey(
  child: CategoryIndexChild,
  mode: BestiaryGroupMode,
): string {
  const meta = parseBestiaryMetadata(child.metadata);
  if (mode === 'type') {
    return meta.creatureType?.trim() || UNKNOWN_KIND;
  }
  return meta.habitat?.trim() || meta.region?.trim() || UNKNOWN_RANGE;
}

export function groupCreatures(
  children: CategoryIndexChild[],
  mode: BestiaryGroupMode,
  isDMUser: boolean,
): BestiaryHabitatSection[] {
  const buckets = new Map<string, CategoryIndexChild[]>();

  for (const child of children) {
    const key = resolveGroupKey(child, mode);
    const list = buckets.get(key) ?? [];
    list.push(child);
    buckets.set(key, list);
  }

  const sections: BestiaryHabitatSection[] = [...buckets.entries()].map(
    ([label, entries]) => {
      const sorted = [...entries].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );
      const sample = parseBestiaryMetadata(sorted[0]?.metadata);
      return {
        label,
        envTint: resolveCreatureEnvironmentTint(sample.habitat, sample.region),
        entries: sorted,
        presence: buildBestiarySectionPresence(sorted, isDMUser),
      };
    },
  );

  sections.sort((a, b) => {
    if (a.label === UNKNOWN_RANGE || a.label === UNKNOWN_KIND) return 1;
    if (b.label === UNKNOWN_RANGE || b.label === UNKNOWN_KIND) return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });

  return sections;
}

export function groupCreaturesByHabitat(
  children: CategoryIndexChild[],
  isDMUser: boolean,
): BestiaryHabitatSection[] {
  return groupCreatures(children, 'habitat', isDMUser);
}
