/**
 * Maps projection render models to view component keys (projection ≠ visualization).
 * Deterministic layout helpers — no persisted coordinates.
 */
import type { Edge, Node } from '@xyflow/react';
import type {
  KinshipEdge,
  KinshipMember,
  RelationsRenderModel,
  SocialDynamicsMode,
  SocialRelationsRenderModel,
  StructureNode,
} from '@shared/relationshipLensProjections';

export type SocialViewKey =
  | 'blocs'
  | 'reputation'
  | 'conflicts'
  | 'connections'
  | 'influence'
  | 'explore';

export function resolveSocialViewKey(model: SocialRelationsRenderModel): SocialViewKey {
  if (model.level === 'cluster') return 'explore';
  if (model.level === 'entity' || model.mode === 'connections') return 'connections';
  if (model.mode === 'reputation') return 'reputation';
  if (model.mode === 'conflicts') return 'conflicts';
  if (model.mode === 'influence') return 'influence';
  return 'blocs';
}

export function isConnectionsCanvasVisible(model: RelationsRenderModel): boolean {
  return model.lens === 'social' && (model.level === 'entity' || model.mode === 'connections');
}

export const SOCIAL_MODE_LABELS: Record<SocialDynamicsMode, string> = {
  blocs: 'Blocs',
  connections: 'Connections',
  reputation: 'Reputation',
  conflicts: 'Conflicts',
  influence: 'Influence',
};

const STRUCTURE_NODE_WIDTH = 160;
const STRUCTURE_NODE_HEIGHT = 48;
const STRUCTURE_X_GAP = 48;
const STRUCTURE_Y_GAP = 72;

export function layoutStructureHierarchy(nodes: StructureNode[]): {
  flowNodes: Node[];
  flowEdges: Edge[];
} {
  if (nodes.length === 0) return { flowNodes: [], flowEdges: [] };

  const byDepth = new Map<number, StructureNode[]>();
  for (const node of nodes) {
    const row = byDepth.get(node.depth) ?? [];
    row.push(node);
    byDepth.set(node.depth, row);
  }
  for (const row of byDepth.values()) {
    row.sort((a, b) => a.title.localeCompare(b.title));
  }

  const flowNodes: Node[] = [];
  for (const [depth, row] of byDepth) {
    const rowWidth = row.length * (STRUCTURE_NODE_WIDTH + STRUCTURE_X_GAP);
    row.forEach((node, index) => {
      const x = index * (STRUCTURE_NODE_WIDTH + STRUCTURE_X_GAP) - rowWidth / 2 + STRUCTURE_NODE_WIDTH / 2;
      const y = depth * STRUCTURE_Y_GAP;
      flowNodes.push({
        id: node.id,
        position: { x, y },
        data: { label: node.title, role: node.role },
        style: { width: STRUCTURE_NODE_WIDTH, height: STRUCTURE_NODE_HEIGHT },
        draggable: false,
      });
    });
  }

  const flowEdges: Edge[] = [];
  for (const node of nodes) {
    if (!node.parentId) continue;
    flowEdges.push({
      id: `${node.parentId}->${node.id}`,
      source: node.parentId,
      target: node.id,
      type: 'smoothstep',
    });
  }

  return { flowNodes, flowEdges };
}

export function groupKinshipByGeneration(
  members: KinshipMember[],
): { generation: number; members: KinshipMember[] }[] {
  const map = new Map<number, KinshipMember[]>();
  for (const member of members) {
    const row = map.get(member.generation) ?? [];
    row.push(member);
    map.set(member.generation, row);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, row]) => ({
      generation,
      members: row.sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

export function kinshipConnectorEdges(
  edges: KinshipEdge[],
  memberIds: Set<string>,
): { parentId: string; childId: string }[] {
  const result: { parentId: string; childId: string }[] = [];
  for (const edge of edges) {
    if (edge.linkKind !== 'parent') continue;
    if (!memberIds.has(edge.sourceId) || !memberIds.has(edge.targetId)) continue;
    result.push({ parentId: edge.targetId, childId: edge.sourceId });
  }
  return result;
}
