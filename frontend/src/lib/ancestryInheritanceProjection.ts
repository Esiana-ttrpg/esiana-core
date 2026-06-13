import {
  parseAncestryMetadata,
  type AncestryMetadataFields,
} from './ancestryMetadata';
import type { WikiTreeNode } from '@/types/wiki';

export type AncestryPageRef = Pick<WikiTreeNode, 'id' | 'title' | 'metadata'>;

export type InheritanceMarker = 'inherited' | 'modified' | 'unique';

export interface StructuredFieldEntry {
  key: string;
  label: string;
  value: string;
  marker: InheritanceMarker;
}

export interface ResolvedAncestryNode {
  pageId: string;
  title: string;
  metadata: AncestryMetadataFields;
}

export interface AncestryInheritanceProjection {
  parentChain: ResolvedAncestryNode[];
  inherited: StructuredFieldEntry[];
  modified: StructuredFieldEntry[];
  unique: StructuredFieldEntry[];
  suppressedTraits: string[];
  effectiveTraits: string[];
  childLineages: AncestryPageRef[];
}

function pageTitle(flatPages: AncestryPageRef[], pageId: string): string {
  return flatPages.find((p) => p.id === pageId)?.title ?? pageId;
}

function resolveParentChain(
  pageId: string,
  flatPages: AncestryPageRef[],
): ResolvedAncestryNode[] {
  const chain: ResolvedAncestryNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null = pageId;
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const page = flatPages.find((p) => p.id === currentId);
    if (!page) break;
    const metadata = parseAncestryMetadata(page.metadata);
    chain.unshift({
      pageId: page.id,
      title: page.title,
      metadata,
    });
    currentId = metadata.parentAncestryId;
  }
  return chain;
}

function mergeEffectiveTraits(
  chain: ResolvedAncestryNode[],
  current: AncestryMetadataFields,
): string[] {
  let traits: string[] = [];
  for (const node of chain.slice(0, -1)) {
    traits = [...node.metadata.baselineTraits];
  }
  if (chain.length === 1 && current.entityKind === 'root') {
    traits = [...current.baselineTraits];
  }
  traits = traits.filter((t) => !current.suppressedTraits.includes(t));
  return [...new Set([...traits, ...current.addedTraits])];
}

function formatLifespan(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max} years`;
  if (min != null) return `${min}+ years`;
  if (max != null) return `Up to ${max} years`;
  return null;
}

function formatList(values: string[]): string | null {
  return values.length > 0 ? values.join(', ') : null;
}

function compareStructuredField(
  fieldKey: string,
  label: string,
  parentValue: string | null,
  childValue: string | null,
  buckets: Pick<AncestryInheritanceProjection, 'inherited' | 'modified' | 'unique'>,
): void {
  if (!childValue && !parentValue) return;
  if (!childValue && parentValue) {
    buckets.inherited.push({ key: fieldKey, label, value: parentValue, marker: 'inherited' });
    return;
  }
  if (childValue && !parentValue) {
    buckets.unique.push({ key: fieldKey, label, value: childValue, marker: 'unique' });
    return;
  }
  if (childValue === parentValue) {
    buckets.inherited.push({ key: fieldKey, label, value: childValue!, marker: 'inherited' });
    return;
  }
  buckets.modified.push({ key: fieldKey, label, value: childValue!, marker: 'modified' });
}

function resolveInheritedStructured(
  chain: ResolvedAncestryNode[],
  current: AncestryMetadataFields,
): Pick<AncestryInheritanceProjection, 'inherited' | 'modified' | 'unique'> {
  const buckets = {
    inherited: [] as StructuredFieldEntry[],
    modified: [] as StructuredFieldEntry[],
    unique: [] as StructuredFieldEntry[],
  };
  if (chain.length <= 1) return buckets;

  const parent = chain[chain.length - 2]?.metadata;
  if (!parent) return buckets;

  const parentLifespan = formatLifespan(parent.lifespanMin, parent.lifespanMax);
  const childLifespan = formatLifespan(current.lifespanMin, current.lifespanMax);
  compareStructuredField('lifespan', 'Lifespan', parentLifespan, childLifespan, buckets);

  compareStructuredField(
    'physiologyTags',
    'Physiology',
    formatList(parent.physiologyTags),
    formatList(current.physiologyTags),
    buckets,
  );
  compareStructuredField(
    'senses',
    'Senses',
    formatList(parent.senses),
    formatList(current.senses),
    buckets,
  );
  compareStructuredField(
    'movementModes',
    'Movement',
    formatList(parent.movementModes),
    formatList(current.movementModes),
    buckets,
  );
  compareStructuredField(
    'climateAdaptations',
    'Climate adaptation',
    formatList(parent.climateAdaptations),
    formatList(current.climateAdaptations),
    buckets,
  );

  for (const trait of current.addedTraits) {
    buckets.unique.push({
      key: `trait:${trait}`,
      label: 'Trait',
      value: trait,
      marker: 'unique',
    });
  }

  for (const trait of current.suppressedTraits) {
    if (parent.baselineTraits.includes(trait)) {
      buckets.modified.push({
        key: `suppressed:${trait}`,
        label: 'Trait suppressed',
        value: trait,
        marker: 'modified',
      });
    }
  }

  for (const trait of parent.baselineTraits) {
    if (current.suppressedTraits.includes(trait)) continue;
    if (current.addedTraits.includes(trait)) continue;
    buckets.inherited.push({
      key: `trait:${trait}`,
      label: 'Trait',
      value: trait,
      marker: 'inherited',
    });
  }

  return buckets;
}

export function childLineagesOf(
  parentPageId: string,
  flatPages: AncestryPageRef[],
): AncestryPageRef[] {
  return flatPages.filter((page) => {
    const meta = parseAncestryMetadata(page.metadata);
    return meta.parentAncestryId === parentPageId && meta.entityKind === 'lineage';
  });
}

export function buildAncestryInheritanceProjection(
  pageId: string,
  flatPages: AncestryPageRef[],
): AncestryInheritanceProjection {
  const chain = resolveParentChain(pageId, flatPages);
  const currentPage = flatPages.find((p) => p.id === pageId);
  const current = parseAncestryMetadata(currentPage?.metadata);
  const buckets = resolveInheritedStructured(chain, current);
  const effectiveTraits = mergeEffectiveTraits(chain, current);
  const childLineages = childLineagesOf(pageId, flatPages);

  return {
    parentChain: chain,
    inherited: buckets.inherited,
    modified: buckets.modified,
    unique: buckets.unique,
    suppressedTraits: current.suppressedTraits,
    effectiveTraits,
    childLineages,
  };
}

export function resolveRootAncestryId(
  pageId: string,
  flatPages: AncestryPageRef[],
): string {
  const chain = resolveParentChain(pageId, flatPages);
  return chain[0]?.pageId ?? pageId;
}

export function pageTitleById(
  flatPages: AncestryPageRef[],
  pageId: string | null,
): string | null {
  if (!pageId) return null;
  return pageTitle(flatPages, pageId);
}
