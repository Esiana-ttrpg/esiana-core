import type { CompositionProfile } from '../compositionDoctrine';
import type { WorkspaceCompositionId } from '../workspaceComposition';
import type { GlobalPaletteId } from './appearancePresets';
import type { EmotionalCadence, GlowTier } from './emotionalCurves';
import { isLightFoundationPalette } from './sidebarAtmosphereRecipes';
import {
  isSceneCompositionPilotPalette,
  MIDNIGHT_COMPOSITION,
  resolvePaletteComposition,
  type PaletteCompositionLogic,
} from './paletteComposition';
import {
  resolveSceneAuthoredOverrides,
  type SceneAuthoredOverrides,
} from './sceneRecipes';

export type SceneId =
  | 'moonlit_archive'
  | 'quiet_codex'
  | 'sunlit_archive'
  | 'quiet_reading_room';

export type RenderZone =
  | 'sidebar'
  | 'hero'
  | 'prose'
  | 'contextRail'
  | 'void'
  | 'float'
  | 'chrome';

export interface ZoneIntensityProfile {
  glowTier: GlowTier;
  specularScale: number;
  absorptionScale: number;
  edgeLightScale: number;
  luminanceOffset: number;
  silence: boolean;
}

export interface SceneCompositionProfile {
  id: SceneId;
  cadence: EmotionalCadence;
  paletteComposition: PaletteCompositionLogic;
  zones: Record<RenderZone, ZoneIntensityProfile>;
  layoutOverrides?: Partial<CompositionProfile>;
  authored?: SceneAuthoredOverrides;
}

export interface ResolveSceneCompositionInput {
  paletteId: GlobalPaletteId | undefined;
  workspaceCompositionId: WorkspaceCompositionId;
  pathname?: string;
}

const SILENT_PROSE: ZoneIntensityProfile = {
  glowTier: 'zero',
  specularScale: 0.008,
  absorptionScale: 1.05,
  edgeLightScale: 0,
  luminanceOffset: 0,
  silence: true,
};

const QUIET_CHROME: ZoneIntensityProfile = {
  glowTier: 'low',
  specularScale: 0.015,
  absorptionScale: 0.9,
  edgeLightScale: 0.3,
  luminanceOffset: -0.01,
  silence: false,
};

const SIDEBAR_ARCHIVE_HEAVY: ZoneIntensityProfile = {
  glowTier: 'medium',
  specularScale: 0.028,
  absorptionScale: 0.82,
  edgeLightScale: 1.35,
  luminanceOffset: 0.015,
  silence: false,
};

const SIDEBAR_FOLIO_MEDIUM: ZoneIntensityProfile = {
  glowTier: 'medium',
  specularScale: 0.022,
  absorptionScale: 0.88,
  edgeLightScale: 1.1,
  luminanceOffset: 0.012,
  silence: false,
};

const HERO_DRAMATIC: ZoneIntensityProfile = {
  glowTier: 'dramatic',
  specularScale: 0.055,
  absorptionScale: 0.7,
  edgeLightScale: 1.1,
  luminanceOffset: 0.025,
  silence: false,
};

const HERO_MEDIUM: ZoneIntensityProfile = {
  glowTier: 'high',
  specularScale: 0.038,
  absorptionScale: 0.82,
  edgeLightScale: 0.95,
  luminanceOffset: 0.015,
  silence: false,
};

const HERO_LOW: ZoneIntensityProfile = {
  glowTier: 'low',
  specularScale: 0.012,
  absorptionScale: 0.95,
  edgeLightScale: 0.4,
  luminanceOffset: 0,
  silence: false,
};

const CONTEXT_RAIL_LOW: ZoneIntensityProfile = {
  glowTier: 'low',
  specularScale: 0.018,
  absorptionScale: 0.88,
  edgeLightScale: 0.5,
  luminanceOffset: -0.005,
  silence: false,
};

const VOID_DEEP: ZoneIntensityProfile = {
  glowTier: 'zero',
  specularScale: 0,
  absorptionScale: 1.35,
  edgeLightScale: 0,
  luminanceOffset: -0.04,
  silence: true,
};

const VOID_PAPER_RECESS: ZoneIntensityProfile = {
  glowTier: 'zero',
  specularScale: 0.006,
  absorptionScale: 1.05,
  edgeLightScale: 0,
  luminanceOffset: 0.02,
  silence: true,
};

const FLOAT_ARTIFACT: ZoneIntensityProfile = {
  glowTier: 'medium',
  specularScale: 0.035,
  absorptionScale: 0.78,
  edgeLightScale: 0.85,
  luminanceOffset: 0.01,
  silence: false,
};

const FLOAT_PAPER: ZoneIntensityProfile = {
  glowTier: 'low',
  specularScale: 0.028,
  absorptionScale: 0.85,
  edgeLightScale: 0.7,
  luminanceOffset: 0.008,
  silence: false,
};

const MOONLIT_ARCHIVE: SceneCompositionProfile = {
  id: 'moonlit_archive',
  cadence: 'restrained_spikes',
  paletteComposition: MIDNIGHT_COMPOSITION,
  zones: {
    sidebar: SIDEBAR_ARCHIVE_HEAVY,
    hero: HERO_DRAMATIC,
    prose: SILENT_PROSE,
    contextRail: CONTEXT_RAIL_LOW,
    void: VOID_DEEP,
    float: FLOAT_ARTIFACT,
    chrome: QUIET_CHROME,
  },
  layoutOverrides: {
    negativeSpaceScale: 1.35,
    focalColumnRatio: 1.5,
  },
  authored: resolveSceneAuthoredOverrides('moonlit_archive'),
};

const QUIET_CODEX: SceneCompositionProfile = {
  id: 'quiet_codex',
  cadence: 'editorial',
  paletteComposition: MIDNIGHT_COMPOSITION,
  zones: {
    sidebar: {
      ...SIDEBAR_ARCHIVE_HEAVY,
      glowTier: 'medium',
      edgeLightScale: 1.5,
    },
    hero: HERO_LOW,
    prose: SILENT_PROSE,
    contextRail: {
      ...CONTEXT_RAIL_LOW,
      glowTier: 'zero',
      specularScale: 0.01,
    },
    void: {
      ...VOID_DEEP,
      luminanceOffset: -0.03,
    },
    float: {
      ...FLOAT_ARTIFACT,
      glowTier: 'low',
    },
    chrome: QUIET_CHROME,
  },
  layoutOverrides: {
    negativeSpaceScale: 1.2,
    contextualRecess: 0.72,
  },
  authored: resolveSceneAuthoredOverrides('quiet_codex'),
};

const SUNLIT_ARCHIVE: SceneCompositionProfile = {
  id: 'sunlit_archive',
  cadence: 'editorial',
  paletteComposition: MIDNIGHT_COMPOSITION,
  zones: {
    sidebar: SIDEBAR_FOLIO_MEDIUM,
    hero: HERO_MEDIUM,
    prose: SILENT_PROSE,
    contextRail: CONTEXT_RAIL_LOW,
    void: VOID_PAPER_RECESS,
    float: FLOAT_PAPER,
    chrome: QUIET_CHROME,
  },
  layoutOverrides: {
    negativeSpaceScale: 1.15,
    focalColumnRatio: 1.35,
  },
};

const QUIET_READING_ROOM: SceneCompositionProfile = {
  id: 'quiet_reading_room',
  cadence: 'editorial',
  paletteComposition: MIDNIGHT_COMPOSITION,
  zones: {
    sidebar: {
      ...SIDEBAR_FOLIO_MEDIUM,
      edgeLightScale: 1.25,
    },
    hero: HERO_LOW,
    prose: SILENT_PROSE,
    contextRail: {
      ...CONTEXT_RAIL_LOW,
      glowTier: 'zero',
      specularScale: 0.01,
    },
    void: {
      ...VOID_PAPER_RECESS,
      luminanceOffset: 0.015,
    },
    float: {
      ...FLOAT_PAPER,
      glowTier: 'low',
    },
    chrome: QUIET_CHROME,
  },
  layoutOverrides: {
    negativeSpaceScale: 1.1,
    contextualRecess: 0.78,
  },
};

const DARK_SCENES: Partial<
  Record<WorkspaceCompositionId, SceneCompositionProfile>
> = {
  dashboard: MOONLIT_ARCHIVE,
  codex: QUIET_CODEX,
  entity: QUIET_CODEX,
};

const LIGHT_SCENES: Partial<
  Record<WorkspaceCompositionId, SceneCompositionProfile>
> = {
  dashboard: SUNLIT_ARCHIVE,
  codex: QUIET_READING_ROOM,
  entity: QUIET_READING_ROOM,
};

export function isSceneCompositionActive(
  paletteId: GlobalPaletteId | undefined,
  workspaceCompositionId: WorkspaceCompositionId,
): boolean {
  if (!isSceneCompositionPilotPalette(paletteId)) return false;
  return (
    workspaceCompositionId === 'dashboard' ||
    workspaceCompositionId === 'codex' ||
    workspaceCompositionId === 'entity'
  );
}

export function resolveSceneComposition(
  input: ResolveSceneCompositionInput,
): SceneCompositionProfile | null {
  const { paletteId, workspaceCompositionId } = input;

  if (!isSceneCompositionActive(paletteId, workspaceCompositionId)) {
    return null;
  }

  const paletteComposition = resolvePaletteComposition(paletteId);
  const sceneMap = isLightFoundationPalette(paletteId) ? LIGHT_SCENES : DARK_SCENES;
  const base = sceneMap[workspaceCompositionId];
  if (!base || !paletteComposition) return null;

  return {
    ...base,
    paletteComposition,
    authored: resolveSceneAuthoredOverrides(base.id, paletteId),
  };
}

export function sceneDataAttributes(
  scene: SceneCompositionProfile | null,
): Record<string, string> {
  if (!scene) return {};
  const attrs: Record<string, string> = {
    'data-scene': scene.id,
    'data-emotional-cadence': scene.cadence,
    'data-scene-edge-bias': scene.paletteComposition.edgeBias,
    'data-scene-focus-gravity': scene.paletteComposition.focusGravity,
  };
  if (scene.authored?.heroGradient && scene.authored.heroGradient !== 'none') {
    attrs['data-scene-hero-gradient'] = scene.authored.heroGradient;
  }
  if (
    scene.authored?.sidebarAtmosphere &&
    scene.authored.sidebarAtmosphere !== 'none'
  ) {
    attrs['data-scene-sidebar-atmosphere'] = scene.authored.sidebarAtmosphere;
  }
  return attrs;
}
