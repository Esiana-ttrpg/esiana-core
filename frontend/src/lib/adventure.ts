import { apiFetch } from './api';
import type { QuestHubNode } from '@/types/wiki';
import type { ArcHierarchyProjection } from '@/lib/arcMetadata';
import type {
  AdventureSection,
  SceneMetadataFields,
  StoryboardProjection,
  StoryboardViewV1,
  NarrativePressureItem,
} from '@/lib/sceneMetadata';
import type { StoryboardNodeEntityType, StoryboardPreset } from '@shared/storyboardProjection';
import type { SceneTimelineProjection } from '@shared/sceneTimelineProjection';
import type { StoryThreadHistoryProjection } from '@shared/storyThreadHistoryProjection';
import type { ConvergenceOverlayBundle } from '@/types/chronologyOverlay';

export interface StoryboardPaletteEntry {
  id: string;
  title: string;
  entityType: StoryboardNodeEntityType;
  threadKind?: string | null;
}

export interface StoryboardPaletteData {
  scenes: StoryboardPaletteEntry[];
  quests: StoryboardPaletteEntry[];
  threads: StoryboardPaletteEntry[];
  characters: StoryboardPaletteEntry[];
  locations: StoryboardPaletteEntry[];
  events: StoryboardPaletteEntry[];
}

export interface SceneHubNode {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  scene: SceneMetadataFields;
  lifecycleState?: string;
  references: {
    participants: Array<{ id: string; title: string; href: string }>;
    location?: { id: string; title: string; href: string } | null;
    quests: Array<{ id: string; title: string; href: string }>;
    clues: Array<{ id: string; title: string; href: string }>;
    threads: Array<{ id: string; title: string; href: string }>;
    followsScenes: Array<{ id: string; title: string; href: string }>;
  };
}

export interface AdventureHubPayload {
  category: {
    id: string;
    title: string;
    parentId: string | null;
    visibility: string;
    updatedAt: string;
    systemCategoryKey?: string | null;
  };
  previewAsPlayer: boolean;
  activeSection: AdventureSection;
  board?: { quests: QuestHubNode[] };
  scenes?: {
    scenes: SceneHubNode[];
    storyboard: StoryboardProjection;
    arcFilterOptions?: Array<{ id: string; title: string }>;
    palette?: StoryboardPaletteData;
    presets?: StoryboardPreset[];
  };
  investigation?: {
    threadsRootId?: string;
    scenesRootId?: string;
    ledger?: {
      rows: Array<{
        id: string;
        kind: 'clue' | 'lead';
        title: string;
        narrativeWeight: string | null;
        reachable: boolean;
        isSpof: boolean;
        pressureAccumulating: boolean;
      }>;
      columns: Array<{
        id: string;
        title: string;
        columnGroup: 'scenes' | 'npcs' | 'locations' | 'discoveries';
        reachable: boolean;
      }>;
      cells: Array<{
        rowId: string;
        columnGroup: 'scenes' | 'npcs' | 'locations' | 'discoveries';
        targetId: string;
        relationKind: string;
        derivationSource: string;
        explanation: string;
        edgeKind: string;
      }>;
      legend: {
        edgeKinds: string[];
        columnGroups: string[];
      };
    };
    nodes: Array<{
      id: string;
      kind: string;
      title: string;
      reachable: boolean;
      pressureAccumulating?: boolean;
    }>;
    edges: Array<{ sourceId: string; targetId: string; edgeKind: string }>;
  };
  continuity?: {
    issues: unknown[];
    counts: Record<string, number>;
    pressureFeed: NarrativePressureItem[];
  };
  arcs?: Array<{ id: string; title: string; arc: unknown }>;
  sessions?: {
    readyScenes: unknown[];
    presets: unknown[];
    storyboardLayout?: StoryboardViewV1;
  };
  arcPages?: Array<{ id: string; title: string; arc: unknown }>;
  arcHierarchy?: ArcHierarchyProjection;
  actLanes?: Array<{ id: string; label: string; actIndex?: number }>;
  timeline?: {
    embedded: boolean;
    chronologyPath?: string;
    overlay?: ConvergenceOverlayBundle;
    defaultDomains?: string[];
  };
  sceneTimeline?: SceneTimelineProjection;
  threadHistory?: StoryThreadHistoryProjection;
  dramaticTopology?: unknown[];
}

export async function fetchAdventureHub(
  campaignHandle: string,
  options?: {
    pageId?: string;
    section?: AdventureSection;
    previewAsPlayer?: boolean;
  },
): Promise<AdventureHubPayload> {
  const params = new URLSearchParams();
  if (options?.previewAsPlayer) params.set('previewAsPlayer', 'true');
  if (options?.section) params.set('section', options.section);
  const qs = params.toString();
  const base = options?.pageId
    ? `/campaigns/${campaignHandle}/wiki/adventure-hub/${options.pageId}`
    : `/campaigns/${campaignHandle}/wiki/adventure-hub`;
  return apiFetch<AdventureHubPayload>(`${base}${qs ? `?${qs}` : ''}`);
}

export async function fetchStoryboardLayout(campaignHandle: string): Promise<{
  layoutPageId: string | null;
  layout: StoryboardViewV1;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/adventure/storyboard`);
}

export async function patchStoryboardLayout(
  campaignHandle: string,
  layout: StoryboardViewV1,
): Promise<{ layoutPageId: string }> {
  return apiFetch(`/campaigns/${campaignHandle}/adventure/storyboard`, {
    method: 'PATCH',
    body: JSON.stringify({ layout }),
  });
}

export async function createObjectivePage(
  campaignHandle: string,
  input: {
    title: string;
    parentId: string;
    summary?: string;
    objectiveStatus?: string;
  },
): Promise<{ id: string }> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      parentId: input.parentId,
      templateType: 'OBJECTIVE',
      metadata: {
        summary: input.summary ?? null,
        objectiveStatus: input.objectiveStatus ?? 'PLANNED',
      },
    }),
  });
}

export async function createScenePage(
  campaignHandle: string,
  input: {
    title: string;
    parentId: string;
    summary?: string;
    beatType?: string;
    sceneKind?: string;
    narrativeWeight?: string;
    linkedQuestPageIds?: string[];
  },
): Promise<{ id: string }> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      parentId: input.parentId,
      templateType: 'SCENE',
      metadata: {
        summary: input.summary ?? null,
        beatType: input.beatType ?? null,
        sceneKind: input.sceneKind ?? null,
        narrativeWeight: input.narrativeWeight ?? 'major',
        linkedQuestPageIds: input.linkedQuestPageIds ?? [],
        sceneStatus: 'PLANNED',
      },
    }),
  });
}
