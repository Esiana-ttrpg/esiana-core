/**
 * Runtime inferred edges for Relations projections (not persisted to EntityRelation).
 */
import {
  EntityGraphEntityTypes,
  EntityRelationDirections,
  EntityRelationKinds,
  EntityRelationSourceDomains,
  type EntityGraphEdge,
} from './entityGraph.js';

const MAX_SHARED_FACTION_PAIRS = 48;

function socialPairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function hasExplicitSocial(
  edges: EntityGraphEdge[],
  a: string,
  b: string,
): boolean {
  const key = socialPairKey(a, b);
  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CHARACTER_SOCIAL) continue;
    const pair = socialPairKey(edge.source.entityId, edge.target.entityId);
    if (pair === key) return true;
  }
  return false;
}

/**
 * Infer weak CHARACTER_SOCIAL ties between characters sharing an affiliation org.
 */
export function augmentWithInferredRelationEdges(
  edges: EntityGraphEdge[],
): EntityGraphEdge[] {
  const byOrg = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CHARACTER_AFFILIATION) continue;
    if (edge.target.entityType !== EntityGraphEntityTypes.WIKI_PAGE) continue;
    const orgId = edge.target.entityId;
    const charId = edge.source.entityId;
    const list = byOrg.get(orgId) ?? [];
    list.push(charId);
    byOrg.set(orgId, list);
  }

  const inferred: EntityGraphEdge[] = [];
  for (const [orgId, members] of byOrg) {
    const unique = [...new Set(members)].sort();
    if (unique.length < 2) continue;
    for (let i = 0; i < unique.length && inferred.length < MAX_SHARED_FACTION_PAIRS; i++) {
      for (let j = i + 1; j < unique.length && inferred.length < MAX_SHARED_FACTION_PAIRS; j++) {
        const a = unique[i]!;
        const b = unique[j]!;
        if (hasExplicitSocial(edges, a, b)) continue;
        const id = `inferred:shared_faction:${a}:${b}`;
        inferred.push({
          id,
          source: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: a },
          target: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: b },
          relationKind: EntityRelationKinds.CHARACTER_SOCIAL,
          direction: EntityRelationDirections.UNDIRECTED_HALF,
          startDate: null,
          endDate: null,
          visibility: null,
          payload: {
            kind: EntityRelationKinds.CHARACTER_SOCIAL,
            narrativeType: 'member',
            semantics: {
              narrativeType: 'member',
              polarity: 'neutral',
              provenance: 'inferred',
              inferenceSource: 'shared_faction',
              context: `Shared affiliation (${orgId})`,
            },
          },
          sourceDomain: EntityRelationSourceDomains.WIKI_METADATA,
          sourceRecordKey: id,
          sourcePageId: a,
        });
      }
    }
  }

  return inferred.length > 0 ? [...edges, ...inferred] : edges;
}
