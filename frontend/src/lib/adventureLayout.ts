import type { WikiTreeNode } from '@/types/wiki';
import {
  isNarrativeScenesCategoryPage,
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_NARRATIVE_SCENES,
} from '@/lib/wikiSystemCategory';
import { readCampaignWorkspaceState } from '@/lib/workspacePersistence';

export function resolveNarrativeScenesRootId(flatPages: WikiTreeNode[]): string | null {
  const byKey = flatPages.find(
    (p) => parseSystemCategoryKey(p.metadata) === SYSTEM_CATEGORY_NARRATIVE_SCENES,
  );
  if (byKey) return byKey.id;

  const gameFolder = flatPages.find((p) => p.title === 'Game' && !p.parentId);
  const gameId = gameFolder?.id;
  const legacy = flatPages.find(
    (p) =>
      p.title === 'Scenes' &&
      (gameId ? p.parentId === gameId : p.parentId != null),
  );
  return legacy?.id ?? null;
}

export function isPageUnderNarrativeScenesCategory(
  pageId: string,
  flatPages: WikiTreeNode[],
): boolean {
  const pageById = new Map(flatPages.map((page) => [page.id, page]));
  const visited = new Set<string>();
  let current = pageById.get(pageId)?.parentId ?? null;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = pageById.get(current);
    if (!node) break;
    if (isNarrativeScenesCategoryPage(node.metadata)) return true;
    current = node.parentId;
  }
  return false;
}

/** Adventure hub story lenses. */
export const STORY_VIEWS = [
  { id: 'quests', label: 'Quests' },
  { id: 'arcs', label: 'Arcs' },
  { id: 'threads', label: 'Threads' },
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'investigation', label: 'Investigation', gmOnly: true },
  { id: 'scenes', label: 'Scenes', gmOnly: true },
  { id: 'storyboard', label: 'Storyboard', gmOnly: true },
] as const;

export type StoryViewId = (typeof STORY_VIEWS)[number]['id'];

export type ThreadsLensId = 'all' | 'activity';

/** Sub-lenses under Adventure › Storyboard. */
export const STORYBOARD_LENSES = [
  { id: 'board', label: 'Board' },
  { id: 'sequence', label: 'Sequence' },
] as const;

export type StoryboardLensId = (typeof STORYBOARD_LENSES)[number]['id'];

export const DEFAULT_STORYBOARD_LENS: StoryboardLensId = 'board';

export type AdventureSidebarItem =
  | {
      kind: 'wiki';
      sectionId: 'narrativeThreads';
      label: string;
    }
  | {
      kind: 'route';
      sectionId: 'creativeDrift';
      label: string;
    };

/** Sidebar submenu under Adventure — folded into story lenses. */
export const ADVENTURE_SIDEBAR_ITEMS: AdventureSidebarItem[] = [];

export function readStoryViewFromSearch(
  search: string,
  campaignHandle?: string,
): StoryViewId {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (view && STORY_VIEWS.some((v) => v.id === view)) {
    return view as StoryViewId;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).adventureStoryView;
    if (sticky && STORY_VIEWS.some((v) => v.id === sticky)) {
      return sticky;
    }
  }
  return 'quests';
}

export function readThreadsLensFromSearch(
  search: string,
  campaignHandle?: string,
): ThreadsLensId {
  const params = new URLSearchParams(search);
  const lens = params.get('threadsLens');
  if (lens === 'activity' || lens === 'all') {
    return lens;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).threadsLens;
    if (sticky === 'activity' || sticky === 'all') {
      return sticky;
    }
  }
  return 'all';
}

export function readStoryboardLensFromSearch(
  search: string,
  campaignHandle?: string,
): StoryboardLensId {
  const params = new URLSearchParams(search);
  const lens = params.get('storyboardLens');
  if (lens && STORYBOARD_LENSES.some((entry) => entry.id === lens)) {
    return lens as StoryboardLensId;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).adventureStoryboardLens;
    if (sticky && STORYBOARD_LENSES.some((entry) => entry.id === sticky)) {
      return sticky;
    }
  }
  return DEFAULT_STORYBOARD_LENS;
}

/** Maps story lens to adventure-hub API section param. */
export function storyViewToApiSection(view: StoryViewId): string {
  switch (view) {
    case 'quests':
      return 'board';
    case 'arcs':
      return 'arcs';
    case 'investigation':
      return 'investigation';
    case 'scenes':
      return 'scenes';
    case 'storyboard':
      return 'scenes';
    case 'threads':
    case 'unresolved':
      return 'board';
    default:
      return 'board';
  }
}

export function adventureViewHref(
  basePath: string,
  view: StoryViewId = 'quests',
  options?: {
    threadsLens?: ThreadsLensId;
    storyboardLens?: StoryboardLensId;
  },
): string {
  const params = new URLSearchParams();
  params.set('view', view);
  if (options?.threadsLens && options.threadsLens !== 'all') {
    params.set('threadsLens', options.threadsLens);
  }
  if (view === 'storyboard' && options?.storyboardLens && options.storyboardLens !== 'board') {
    params.set('storyboardLens', options.storyboardLens);
  }
  return `${basePath}?${params.toString()}`;
}
