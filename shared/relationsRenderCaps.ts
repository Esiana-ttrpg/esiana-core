/**
 * Relations workspace render safety caps (browser-safe).
 */

export const RELATIONS_RENDER_CAP_DEFAULTS = {
  maxVisibleNodes: 50,
  maxVisibleEdges: 80,
} as const;

export const RELATIONS_RENDER_CAP_LIMITS = {
  minNodes: 20,
  maxNodes: 100,
  minEdges: 40,
  maxEdges: 200,
} as const;

export const PROJECTION_DERIVED = {
  maxBlocCount: 12,
  maxMembersPerBloc: 15,
  maxNarrativeBullets: 5,
  maxTopActorsPerTension: 3,
} as const;

export type RelationsRenderCaps = {
  maxVisibleNodes: number;
  maxVisibleEdges: number;
};

export type RelationsTruncationReason =
  | 'node_cap'
  | 'edge_cap'
  | 'bloc_cap'
  | 'member_cap'
  | 'cluster'
  | 'scope_limit'
  | 'none';

export type RelationsTruncation = {
  visibleNodes: number;
  hiddenNodes: number;
  visibleEdges: number;
  hiddenEdges: number;
  appliedNodeCap: number;
  appliedEdgeCap: number;
  truncationReason: RelationsTruncationReason;
  truncationReasons?: RelationsTruncationReason[];
};

export type RelationsCapsInput = {
  relationsMaxVisibleNodes?: number | null;
  relationsMaxVisibleEdges?: number | null;
};

export function clampCap(
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function resolveRelationsRenderCaps(
  input?: RelationsCapsInput | null,
): RelationsRenderCaps {
  return {
    maxVisibleNodes: clampCap(
      input?.relationsMaxVisibleNodes,
      RELATIONS_RENDER_CAP_DEFAULTS.maxVisibleNodes,
      RELATIONS_RENDER_CAP_LIMITS.minNodes,
      RELATIONS_RENDER_CAP_LIMITS.maxNodes,
    ),
    maxVisibleEdges: clampCap(
      input?.relationsMaxVisibleEdges,
      RELATIONS_RENDER_CAP_DEFAULTS.maxVisibleEdges,
      RELATIONS_RENDER_CAP_LIMITS.minEdges,
      RELATIONS_RENDER_CAP_LIMITS.maxEdges,
    ),
  };
}

export function buildRelationsTruncation(input: {
  visibleNodes: number;
  totalNodes: number;
  visibleEdges: number;
  totalEdges: number;
  caps: RelationsRenderCaps;
  reasons?: RelationsTruncationReason[];
}): RelationsTruncation {
  const hiddenNodes = Math.max(0, input.totalNodes - input.visibleNodes);
  const hiddenEdges = Math.max(0, input.totalEdges - input.visibleEdges);
  const reasons = [...(input.reasons ?? [])];
  if (hiddenNodes > 0 && !reasons.includes('node_cap')) {
    reasons.push('node_cap');
  }
  if (hiddenEdges > 0 && !reasons.includes('edge_cap') && !reasons.includes('cluster')) {
    reasons.push('edge_cap');
  }
  let truncationReason: RelationsTruncationReason = 'none';
  if (reasons.length > 0) {
    truncationReason = reasons[0]!;
  } else if (hiddenEdges > 0) {
    truncationReason = 'edge_cap';
  } else if (hiddenNodes > 0) {
    truncationReason = 'node_cap';
  }
  return {
    visibleNodes: input.visibleNodes,
    hiddenNodes,
    visibleEdges: input.visibleEdges,
    hiddenEdges,
    appliedNodeCap: input.caps.maxVisibleNodes,
    appliedEdgeCap: input.caps.maxVisibleEdges,
    truncationReason,
    truncationReasons: reasons.length > 0 ? reasons : undefined,
  };
}

export function truncationUserMessage(truncation: RelationsTruncation): string | null {
  const { truncationReason, hiddenNodes, hiddenEdges } = truncation;
  if (truncationReason === 'none') return null;
  if (truncationReason === 'node_cap' || truncationReason === 'edge_cap') {
    if (hiddenNodes > 0) return `+${hiddenNodes} more connections hidden`;
    if (hiddenEdges > 0) return `+${hiddenEdges} more ties hidden`;
  }
  if (truncationReason === 'bloc_cap') return `+${hiddenNodes} more factions not shown`;
  if (truncationReason === 'member_cap') return `+${hiddenNodes} more members in this faction`;
  if (truncationReason === 'cluster' && hiddenEdges > 0) {
    return `${hiddenEdges} supporting ties summarized`;
  }
  return null;
}
