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
] as const;

export type StoryViewId = (typeof STORY_VIEWS)[number]['id'];

export type ThreadsLensId = 'all' | 'activity';

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

/** Legacy section ids from pre-restructure Adventure. */
export const LEGACY_ADVENTURE_SECTIONS = [
  'board',
  'scenes',
  'investigation',
  'continuity',
  'arcs',
  'sessions',
  'scene-timeline',
  'thread-history',
  'timeline',
  'story',
] as const;

export type LegacyAdventureSectionId = (typeof LEGACY_ADVENTURE_SECTIONS)[number];

export type AdventureLegacyRedirect =
  | { kind: 'adventure'; view?: StoryViewId; threadsLens?: ThreadsLensId }
  | {
      kind: 'progression';
      section: string;
      view?: import('@shared/progressionHub').ScenesViewId;
    }
  | { kind: 'none' };

/** Maps legacy ?section= values to new destinations. */
export function resolveLegacyAdventureSection(
  section: string | null,
): AdventureLegacyRedirect | null {
  if (!section) return null;
  switch (section) {
    case 'board':
      return { kind: 'adventure', view: 'quests' };
    case 'arcs':
      return { kind: 'adventure', view: 'arcs' };
    case 'investigation':
      return { kind: 'adventure', view: 'investigation' };
    case 'continuity':
    case 'timeline':
    case 'story':
      return { kind: 'adventure', view: 'quests' };
    case 'thread-history':
      return {
        kind: 'adventure',
        view: 'threads',
        threadsLens: 'activity',
      };
    case 'scenes':
      return { kind: 'progression', section: 'scenes' };
    case 'scene-timeline':
      return { kind: 'progression', section: 'scenes', view: 'sequence' };
    case 'sessions':
      return { kind: 'progression', section: 'sessionPrep' };
    default:
      return null;
  }
}

export function readStoryViewFromSearch(
  search: string,
  campaignHandle?: string,
): StoryViewId {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (view && STORY_VIEWS.some((v) => v.id === view)) {
    return view as StoryViewId;
  }
  const legacySection = params.get('section');
  if (legacySection === 'arcs') return 'arcs';
  if (legacySection === 'investigation') return 'investigation';
  if (legacySection === 'board') return 'quests';
  if (legacySection === 'timeline' || legacySection === 'story' || legacySection === 'continuity') {
    return 'quests';
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
  if (params.get('section') === 'thread-history') {
    return 'activity';
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).threadsLens;
    if (sticky === 'activity' || sticky === 'all') {
      return sticky;
    }
  }
  return 'all';
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
  threadsLens?: ThreadsLensId,
): string {
  const params = new URLSearchParams();
  params.set('view', view);
  if (threadsLens && threadsLens !== 'all') {
    params.set('threadsLens', threadsLens);
  }
  return `${basePath}?${params.toString()}`;
}

export function needsLegacyAdventureRedirect(search: string): AdventureLegacyRedirect | null {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  if (!section) return null;

  const resolved = resolveLegacyAdventureSection(section);
  if (resolved?.kind === 'progression') return resolved;

  const explicitView = params.get('view');
  const view =
    explicitView && STORY_VIEWS.some((v) => v.id === explicitView)
      ? (explicitView as StoryViewId)
      : resolved?.kind === 'adventure'
        ? (resolved.view ?? 'quests')
        : readStoryViewFromSearch(search);

  const threadsLens = readThreadsLensFromSearch(search);

  return {
    kind: 'adventure',
    view,
    threadsLens: threadsLens !== 'all' ? threadsLens : undefined,
  };
}
