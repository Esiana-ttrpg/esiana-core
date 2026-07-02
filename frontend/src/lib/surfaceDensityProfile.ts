import type { WikiPageBlockType } from '@/types/wiki';
import {
  getExpandedLayoutBehavior,
  getWorkspaceOrchestration,
  type ExpandedLayoutBehavior,
  type WorkspaceOrchestrationProfile,
} from '@/lib/workspaceOrchestration';
import type { CodexMeasureTier } from '@/lib/densityConstants';

export type PreferredMeasure = 'readable' | 'workspace';

/** Which semantic readable cap a block uses — `active` follows the page-resolved measure. */
export type ReadableMeasureTier = CodexMeasureTier | 'active';

export type WorkspaceMode = 'focused' | 'balanced' | 'expanded' | 'immersive';

export type { WorkspaceOrchestrationProfile, ExpandedLayoutBehavior };
export { getWorkspaceOrchestration, getExpandedLayoutBehavior };

export interface BlockDensityProfile {
  preferredMeasure: PreferredMeasure;
  /** Semantic readable cap for prose blocks; `active` uses page `--codex-readable-ch`. */
  readableMeasureTier?: ReadableMeasureTier;
  minW: number;
  recommendedW: number;
  minH: number;
}

const BLOCK_DENSITY: Partial<Record<WikiPageBlockType, BlockDensityProfile>> = {
  'text-tiptap': {
    preferredMeasure: 'readable',
    readableMeasureTier: 'active',
    minW: 1,
    recommendedW: 2,
    minH: 1,
  },
  'text-biography': {
    preferredMeasure: 'readable',
    readableMeasureTier: 'tight',
    minW: 1,
    recommendedW: 2,
    minH: 1,
  },
  'entity-hero': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'entity-appearance': { preferredMeasure: 'workspace', minW: 2, recommendedW: 3, minH: 1 },
  'entity-relationships': { preferredMeasure: 'workspace', minW: 1, recommendedW: 2, minH: 1 },
  'entity-timeline': { preferredMeasure: 'workspace', minW: 1, recommendedW: 2, minH: 2 },
  'entity-discovery': { preferredMeasure: 'workspace', minW: 1, recommendedW: 2, minH: 1 },
  'entity-org-hero': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'entity-family-hero': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'entity-location-hero': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'entity-bestiary-hero': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'entity-ancestry-hero': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'wiki-infobox': { preferredMeasure: 'workspace', minW: 1, recommendedW: 1, minH: 1 },
  'wiki-backlinks': { preferredMeasure: 'workspace', minW: 1, recommendedW: 3, minH: 1 },
  'image-display': { preferredMeasure: 'workspace', minW: 1, recommendedW: 1, minH: 1 },
  'stat-block': { preferredMeasure: 'workspace', minW: 1, recommendedW: 1, minH: 1 },
};

const DEFAULT_DENSITY: BlockDensityProfile = {
  preferredMeasure: 'workspace',
  minW: 1,
  recommendedW: 1,
  minH: 1,
};

export function getBlockDensityProfile(type: WikiPageBlockType): BlockDensityProfile {
  return BLOCK_DENSITY[type] ?? DEFAULT_DENSITY;
}

export function defaultWorkspaceModeForTemplate(templateType: string): WorkspaceMode {
  const t = templateType.trim().toUpperCase();
  if (t === 'SESSION_NOTE') return 'focused';
  if (t === 'CHARACTER' || t === 'ORGANIZATION' || t === 'FAMILY') return 'balanced';
  return 'balanced';
}

export function measureContentClass(
  measure: PreferredMeasure,
  workspaceMode: WorkspaceMode,
  measureTier: ReadableMeasureTier = 'active',
): string {
  if (measure === 'workspace') return 'w-full min-w-0';

  const readableVar =
    measureTier === 'active'
      ? 'var(--codex-readable-ch)'
      : measureTier === 'tight'
        ? 'var(--codex-readable-ch-tight)'
        : measureTier === 'standard'
          ? 'var(--codex-readable-ch-standard)'
          : 'var(--codex-readable-ch-hybrid)';

  const maxWidth = `max-w-[${readableVar}]`;

  if (workspaceMode === 'focused') {
    return `w-full ${maxWidth} mx-auto wiki-measure-focused`;
  }
  if (workspaceMode === 'immersive') {
    return `w-full ${maxWidth} mx-auto wiki-measure-immersive`;
  }
  if (workspaceMode === 'expanded') {
    return `w-full ${maxWidth}`;
  }
  return `w-full ${maxWidth} mx-auto`;
}
