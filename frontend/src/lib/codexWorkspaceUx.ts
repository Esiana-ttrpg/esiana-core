import {
  getMasterPageWidthPreference,
  type MasterPageWidth,
} from '@/lib/pageWidthPreference';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import {
  ENTITY_WORKSPACE_SURFACE_KEYS,
  type SurfaceProfileKey,
} from '@/lib/entitySurfaceProfile';
import {
  CODEX_READABLE_CH_DEFAULT,
  CODEX_READABLE_CH_HYBRID,
  CODEX_READABLE_CH_STANDARD,
  CODEX_READABLE_CH_TIGHT,
  type CodexMeasureTier,
  READING_MEASURE_HYBRID_STANDARD_CH,
  READING_MEASURE_HYBRID_WIDE_CH,
  READING_MEASURE_STANDARD_STANDARD_CH,
  READING_MEASURE_STANDARD_WIDE_CH,
  READING_MEASURE_TIGHT_STANDARD_CH,
  READING_MEASURE_TIGHT_WIDE_CH,
  WRITING_MEASURE_HYBRID_STANDARD_CH,
  WRITING_MEASURE_HYBRID_WIDE_CH,
  WRITING_MEASURE_STANDARD_STANDARD_CH,
  WRITING_MEASURE_STANDARD_WIDE_CH,
  WRITING_MEASURE_TIGHT_STANDARD_CH,
  WRITING_MEASURE_TIGHT_WIDE_CH,
} from '@/lib/densityConstants';

export type CodexCognitiveMode = 'reading' | 'writing';

export type CodexLayoutVariant = 'standard' | 'wide';

export const CODEX_COGNITIVE_MODES: { id: CodexCognitiveMode; label: string }[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'writing', label: 'Writing' },
];

export const CODEX_LAYOUT_VARIANTS: { id: CodexLayoutVariant; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'wide', label: 'Wide' },
];

const LAYOUT_STORAGE_PREFIX = 'wiki-codex-layout:';

const HYBRID_TEMPLATE_TYPES = new Set([
  'CHARACTER',
  'ORGANIZATION',
  'FAMILY',
  'LOCATION',
  'SESSION_NOTE',
]);

export function cognitiveModeToWorkspaceMode(
  mode: CodexCognitiveMode,
  _layout: CodexLayoutVariant,
): WorkspaceMode {
  if (mode === 'writing') return 'expanded';
  return 'focused';
}

export function workspaceModeToCognitiveUx(mode: WorkspaceMode): {
  cognitiveMode: CodexCognitiveMode;
  layout: CodexLayoutVariant;
} {
  if (mode === 'expanded') {
    return { cognitiveMode: 'writing', layout: 'standard' };
  }
  if (mode === 'balanced') {
    return { cognitiveMode: 'reading', layout: 'wide' };
  }
  if (mode === 'immersive') {
    return { cognitiveMode: 'reading', layout: 'standard' };
  }
  return { cognitiveMode: 'reading', layout: 'standard' };
}

export function loadCodexLayout(pageId: string, fallback: CodexLayoutVariant): CodexLayoutVariant {
  try {
    const raw = localStorage.getItem(`${LAYOUT_STORAGE_PREFIX}${pageId}`);
    if (raw === 'standard' || raw === 'wide') return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveCodexLayout(pageId: string, layout: CodexLayoutVariant): void {
  try {
    localStorage.setItem(`${LAYOUT_STORAGE_PREFIX}${pageId}`, layout);
  } catch {
    /* ignore */
  }
}

/** Map wiki template to a semantic readable-measure tier. */
export function resolveCodexMeasureTier(templateType: string): CodexMeasureTier {
  const normalized = templateType.trim().toUpperCase();
  if (HYBRID_TEMPLATE_TYPES.has(normalized)) return 'hybrid';
  return 'standard';
}

/** Entity workspace pages always use hybrid measure tier. */
export function resolveEntityMeasureTier(surfaceKey: SurfaceProfileKey): CodexMeasureTier {
  if (ENTITY_WORKSPACE_SURFACE_KEYS.has(surfaceKey)) return 'hybrid';
  return resolveCodexMeasureTier('');
}

/** Resolve measure tier from surface key with template fallback. */
export function resolvePageMeasureTier(
  surfaceKey: SurfaceProfileKey,
  templateType: string,
): CodexMeasureTier {
  if (ENTITY_WORKSPACE_SURFACE_KEYS.has(surfaceKey)) return 'hybrid';
  return resolveCodexMeasureTier(templateType);
}

function readingMeasureForTier(tier: CodexMeasureTier, layout: CodexLayoutVariant): number {
  const wide = layout === 'wide';
  if (tier === 'tight') {
    return wide ? READING_MEASURE_TIGHT_WIDE_CH : READING_MEASURE_TIGHT_STANDARD_CH;
  }
  if (tier === 'hybrid') {
    return wide ? READING_MEASURE_HYBRID_WIDE_CH : READING_MEASURE_HYBRID_STANDARD_CH;
  }
  return wide ? READING_MEASURE_STANDARD_WIDE_CH : READING_MEASURE_STANDARD_STANDARD_CH;
}

function writingMeasureForTier(tier: CodexMeasureTier, layout: CodexLayoutVariant): number {
  const wide = layout === 'wide';
  if (tier === 'tight') {
    return wide ? WRITING_MEASURE_TIGHT_WIDE_CH : WRITING_MEASURE_TIGHT_STANDARD_CH;
  }
  if (tier === 'hybrid') {
    return wide ? WRITING_MEASURE_HYBRID_WIDE_CH : WRITING_MEASURE_HYBRID_STANDARD_CH;
  }
  return wide ? WRITING_MEASURE_STANDARD_WIDE_CH : WRITING_MEASURE_STANDARD_STANDARD_CH;
}

/** Map user profile document width to codex readable measure variant. */
export function masterPageWidthToCodexLayout(
  width: MasterPageWidth = getMasterPageWidthPreference(),
): CodexLayoutVariant {
  return width;
}

export function resolveReadableMeasureCh(
  cognitiveMode: CodexCognitiveMode,
  layout: CodexLayoutVariant,
  tier: CodexMeasureTier = 'standard',
): number {
  if (cognitiveMode === 'writing') {
    return writingMeasureForTier(tier, layout);
  }
  return readingMeasureForTier(tier, layout);
}

/** Migrate legacy workspace modes into cognitive mode + layout. */
export function migrateLegacyWorkspaceMode(mode: WorkspaceMode): {
  cognitiveMode: CodexCognitiveMode;
  layout: CodexLayoutVariant;
  workspaceMode: WorkspaceMode;
} {
  const ux = workspaceModeToCognitiveUx(mode);
  if (mode === 'balanced' && ux.cognitiveMode === 'reading') {
    return { ...ux, workspaceMode: 'focused' };
  }
  if (mode === 'immersive') {
    return {
      cognitiveMode: 'reading',
      layout: 'standard',
      workspaceMode: 'focused',
    };
  }
  return {
    ...ux,
    workspaceMode: cognitiveModeToWorkspaceMode(ux.cognitiveMode, ux.layout),
  };
}

export {
  CODEX_READABLE_CH_DEFAULT,
  CODEX_READABLE_CH_HYBRID,
  CODEX_READABLE_CH_STANDARD,
  CODEX_READABLE_CH_TIGHT,
};
