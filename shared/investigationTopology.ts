/**
 * Layer 5 — investigation topology graph builder.
 */
export type InvestigationNodeKind =
  | 'clue'
  | 'revelation'
  | 'lead'
  | 'scene'
  | 'location'
  | 'npc'
  | 'unlock';

export type InvestigationEdgeKind = 'guaranteed' | 'optional' | 'spof_risk';

export interface InvestigationNode {
  id: string;
  kind: InvestigationNodeKind;
  title: string;
  reachable: boolean;
  pressureAccumulating: boolean;
}

export interface InvestigationEdge {
  sourceId: string;
  targetId: string;
  edgeKind: InvestigationEdgeKind;
}

export interface InvestigationTopology {
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
}

export {
  buildInvestigationDependencyLedger,
  type BuildInvestigationDependencyLedgerInput,
  type InvestigationDependencyLedger,
  type InvestigationLedgerCell,
  type InvestigationLedgerColumn,
  type InvestigationLedgerColumnGroup,
  type InvestigationLedgerRow,
  type InvestigationLedgerSceneScan,
  type InvestigationLedgerThreadScan,
} from './investigationDependencyLedger.js';

import { buildInvestigationDependencyLedger } from './investigationDependencyLedger.js';

export function buildInvestigationTopology(input: {
  clueThreads: Array<{ id: string; title: string; reachable: boolean }>;
  linkedScenes: Array<{ id: string; title: string; clueId: string }>;
  spofClueIds: Set<string>;
  unreachableIds: Set<string>;
}): InvestigationTopology {
  const titlesById = new Map<string, string>();
  for (const clue of input.clueThreads) titlesById.set(clue.id, clue.title);
  for (const scene of input.linkedScenes) titlesById.set(scene.id, scene.title);

  const scenes = input.linkedScenes.map((linked) => ({
    id: linked.id,
    title: linked.title,
    sceneKind: null,
    participantPageIds: [] as string[],
    locationPageId: null,
    linkedCluePageIds: [linked.clueId],
    linkedThreadPageIds: [] as string[],
    outcomes: [] as import('./sceneMetadata.js').SceneOutcomeEntry[],
    reachable: !input.unreachableIds.has(linked.id),
  }));

  const threads = input.clueThreads.map((clue) => ({
    id: clue.id,
    title: clue.title,
    threadKind: 'clue' as const,
    narrativeWeight: null,
    relatedPageIds: [] as string[],
    payoffPageId: null,
    reachable: clue.reachable,
    playerSubmitted: false,
  }));

  const result = buildInvestigationDependencyLedger({
    threads,
    scenes,
    titlesById,
    spofClueIds: input.spofClueIds,
    unreachableIds: input.unreachableIds,
  });

  return { nodes: result.nodes, edges: result.edges };
}
