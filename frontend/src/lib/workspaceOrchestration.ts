import type { BlockDisplayScale } from '@/lib/blockDisplayState';
import type { WikiPageBlockType } from '@/types/wiki';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import {
  CODEX_READABLE_CH_DEFAULT,
  CODEX_READABLE_CH_HYBRID,
  CODEX_READABLE_CH_STANDARD,
  CODEX_READABLE_CH_TIGHT,
} from '@/lib/densityConstants';

export type CodexRailDensity = 'hidden' | 'compact' | 'full';
export type HeaderChromeDensity = 'minimal' | 'standard' | 'operational';
/** How a single-block expand reflows siblings in editorial flow. */
export type ExpandedLayoutBehavior = 'prose-stack' | 'editorial-reflow' | 'dense-grid';

export interface WorkspaceOrchestrationProfile {
  id: WorkspaceMode;
  label: string;
  tagline: string;
  /** Readable measure width (ch unit for CSS var). */
  readableMeasureCh: number;
  /** Stack blocks vertically in editorial flow (prose-first). */
  forceEditorialStack: boolean;
  /** On load / mode switch, expand primary prose block. */
  autoExpandProseBlock: boolean;
  /** Default display scale for prose when auto-expanding. */
  defaultProseDisplayScale: BlockDisplayScale;
  /** Deep-edit opens focus overlay instead of expanded tile. */
  preferFocusOverlay: boolean;
  /** Open Codex rail when switching to this mode. */
  codexRailDefaultOpen: boolean;
  /** Rail presentation when open. */
  codexRailDensity: CodexRailDensity;
  /** Dim sibling blocks when one block is expanded. */
  dimInactiveBlocksOnExpand: boolean;
  /** Prefer layout grid (drag mode) when entering edit. */
  layoutGridDefaultOnEdit: boolean;
  /** Header status strip density. */
  headerChrome: HeaderChromeDensity;
  /** Show per-block titles above content in read/editorial mode. */
  showBlockTitlesRead: boolean;
  /** Block sort priority (lower = earlier in stack / reader order). */
  blockPriority: Partial<Record<WikiPageBlockType, number>>;
  /** Breakpoint below which reader-first stack always applies. */
  readerStackBreakpointPx: number;
  /** Editorial expand: stack prose, reflow grid, or keep dense tiles visible. */
  expandedLayoutBehavior: ExpandedLayoutBehavior;
}

const PROSE_TYPES: WikiPageBlockType[] = ['text-biography', 'text-tiptap'];

const FOCUSED_PRIORITY: Partial<Record<WikiPageBlockType, number>> = {
  'entity-hero': 0,
  'entity-org-hero': 0,
  'entity-family-hero': 0,
  'entity-location-hero': 0,
  'entity-bestiary-hero': 0,
  'entity-ancestry-hero': 0,
  'text-biography': 1,
  'text-tiptap': 2,
  'entity-appearance': 3,
  'wiki-infobox': 8,
  'entity-relationships': 9,
  'wiki-backlinks': 10,
};

const BALANCED_PRIORITY: Partial<Record<WikiPageBlockType, number>> = {
  ...FOCUSED_PRIORITY,
  'wiki-infobox': 4,
};

const EXPANDED_PRIORITY: Partial<Record<WikiPageBlockType, number>> = {
  'entity-hero': 0,
  'entity-org-hero': 0,
  'entity-family-hero': 0,
  'entity-location-hero': 0,
  'entity-bestiary-hero': 0,
  'entity-ancestry-hero': 0,
  'entity-relationships': 2,
  'entity-timeline': 3,
  'entity-discovery': 4,
  'entity-appearance': 5,
  'wiki-infobox': 6,
  'text-biography': 7,
  'text-tiptap': 8,
  'wiki-backlinks': 9,
};

const PROFILES: Record<WorkspaceMode, WorkspaceOrchestrationProfile> = {
  focused: {
    id: 'focused',
    label: 'Focused',
    tagline: 'Prose-first narrative',
    readableMeasureCh: 84,
    forceEditorialStack: true,
    autoExpandProseBlock: true,
    defaultProseDisplayScale: 'expanded',
    preferFocusOverlay: false,
    codexRailDefaultOpen: false,
    codexRailDensity: 'compact',
    dimInactiveBlocksOnExpand: true,
    layoutGridDefaultOnEdit: false,
    headerChrome: 'minimal',
    showBlockTitlesRead: false,
    blockPriority: FOCUSED_PRIORITY,
    readerStackBreakpointPx: 1280,
    expandedLayoutBehavior: 'prose-stack',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    tagline: 'Default editorial layout',
    readableMeasureCh: 90,
    forceEditorialStack: false,
    autoExpandProseBlock: false,
    defaultProseDisplayScale: 'compact',
    preferFocusOverlay: false,
    codexRailDefaultOpen: false,
    codexRailDensity: 'full',
    dimInactiveBlocksOnExpand: true,
    layoutGridDefaultOnEdit: false,
    headerChrome: 'standard',
    showBlockTitlesRead: true,
    blockPriority: BALANCED_PRIORITY,
    readerStackBreakpointPx: 1024,
    expandedLayoutBehavior: 'editorial-reflow',
  },
  expanded: {
    id: 'expanded',
    label: 'Expanded',
    tagline: 'DM operational density',
    readableMeasureCh: 92,
    forceEditorialStack: false,
    autoExpandProseBlock: false,
    defaultProseDisplayScale: 'compact',
    preferFocusOverlay: false,
    codexRailDefaultOpen: false,
    codexRailDensity: 'full',
    dimInactiveBlocksOnExpand: false,
    layoutGridDefaultOnEdit: true,
    headerChrome: 'operational',
    showBlockTitlesRead: true,
    blockPriority: EXPANDED_PRIORITY,
    readerStackBreakpointPx: 768,
    expandedLayoutBehavior: 'dense-grid',
  },
  immersive: {
    id: 'immersive',
    label: 'Immersive',
    tagline: 'Worldbuilding immersion — open Codex when you need context',
    readableMeasureCh: 76,
    forceEditorialStack: false,
    autoExpandProseBlock: false,
    defaultProseDisplayScale: 'compact',
    preferFocusOverlay: true,
    codexRailDefaultOpen: false,
    codexRailDensity: 'full',
    dimInactiveBlocksOnExpand: false,
    layoutGridDefaultOnEdit: false,
    headerChrome: 'minimal',
    showBlockTitlesRead: false,
    blockPriority: FOCUSED_PRIORITY,
    readerStackBreakpointPx: 1024,
    expandedLayoutBehavior: 'editorial-reflow',
  },
};

export function getExpandedLayoutBehavior(mode: WorkspaceMode): ExpandedLayoutBehavior {
  return getWorkspaceOrchestration(mode).expandedLayoutBehavior;
}

export function getWorkspaceOrchestration(mode: WorkspaceMode): WorkspaceOrchestrationProfile {
  return PROFILES[mode] ?? PROFILES.balanced;
}

export function getBlockPriority(
  type: WikiPageBlockType,
  mode: WorkspaceMode,
): number {
  const profile = getWorkspaceOrchestration(mode);
  return profile.blockPriority[type] ?? 99;
}

export function sortBlocksByWorkspacePriority(
  blocks: import('@/types/wiki').WikiPageBlock[],
  mode: WorkspaceMode,
): import('@/types/wiki').WikiPageBlock[] {
  return [...blocks].sort(
    (a, b) =>
      getBlockPriority(a.type, mode) - getBlockPriority(b.type, mode) ||
      a.y - b.y ||
      a.x - b.x ||
      a.id.localeCompare(b.id),
  );
}

export function findPrimaryProseBlockId(
  blocks: import('@/types/wiki').WikiPageBlock[],
): string | null {
  for (const type of PROSE_TYPES) {
    const match = blocks.find((b) => b.type === type);
    if (match) return match.id;
  }
  return null;
}

export function workspaceModeCssVars(
  mode: WorkspaceMode,
  measureCh?: number,
): Record<string, string> {
  const profile = getWorkspaceOrchestration(mode);
  const ch = measureCh ?? profile.readableMeasureCh;
  return {
    '--codex-readable-ch': `${ch}ch`,
    '--codex-readable-ch-tight': `${CODEX_READABLE_CH_TIGHT}ch`,
    '--codex-readable-ch-standard': `${CODEX_READABLE_CH_STANDARD}ch`,
    '--codex-readable-ch-hybrid': `${CODEX_READABLE_CH_HYBRID}ch`,
    '--text-measure-ch': String(ch),
    '--text-measure-wide-ch': String(CODEX_READABLE_CH_HYBRID),
    '--text-measure-max-ch': String(CODEX_READABLE_CH_HYBRID),
  };
}

export function shouldForceEditorialStack(
  mode: WorkspaceMode,
  gridWidth: number,
  readerFirstLayout: boolean,
): boolean {
  const profile = getWorkspaceOrchestration(mode);
  if (profile.forceEditorialStack) return true;
  if (readerFirstLayout) return true;
  return gridWidth > 0 && gridWidth < profile.readerStackBreakpointPx;
}
