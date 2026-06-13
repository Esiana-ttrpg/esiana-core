import type { WorkspaceCompositionId } from './workspaceComposition';

export type CompositionStance =
  | 'hero_dominant'
  | 'editorial_stream'
  | 'entity_workspace'
  | 'hub_stagger'
  | 'studio_field';

export interface CompositionProfile {
  stance: CompositionStance;
  focalColumnRatio: number;
  negativeSpaceScale: number;
  contextualRecess: number;
  widgetWeightCurve: 'flat' | 'staggered';
}

const PROFILES: Record<WorkspaceCompositionId, CompositionProfile> = {
  dashboard: {
    stance: 'hero_dominant',
    focalColumnRatio: 1.45,
    negativeSpaceScale: 1.25,
    contextualRecess: 0.82,
    widgetWeightCurve: 'staggered',
  },
  codex: {
    stance: 'editorial_stream',
    focalColumnRatio: 1.35,
    negativeSpaceScale: 1.15,
    contextualRecess: 0.78,
    widgetWeightCurve: 'flat',
  },
  entity: {
    stance: 'entity_workspace',
    focalColumnRatio: 1.42,
    negativeSpaceScale: 1.18,
    contextualRecess: 0.8,
    widgetWeightCurve: 'flat',
  },
  hub: {
    stance: 'hub_stagger',
    focalColumnRatio: 1,
    negativeSpaceScale: 1.2,
    contextualRecess: 0.85,
    widgetWeightCurve: 'staggered',
  },
  studio: {
    stance: 'studio_field',
    focalColumnRatio: 1.25,
    negativeSpaceScale: 1.3,
    contextualRecess: 0.8,
    widgetWeightCurve: 'flat',
  },
  reference: {
    stance: 'editorial_stream',
    focalColumnRatio: 1.2,
    negativeSpaceScale: 1.1,
    contextualRecess: 0.75,
    widgetWeightCurve: 'flat',
  },
  document: {
    stance: 'editorial_stream',
    focalColumnRatio: 1,
    negativeSpaceScale: 1,
    contextualRecess: 1,
    widgetWeightCurve: 'flat',
  },
};

export function getCompositionProfile(
  composition: WorkspaceCompositionId | undefined,
): CompositionProfile | null {
  if (!composition) return null;
  return PROFILES[composition];
}

export function mergeCompositionWithScene(
  base: CompositionProfile,
  sceneOverrides?: Partial<CompositionProfile>,
): CompositionProfile {
  if (!sceneOverrides) return base;
  return { ...base, ...sceneOverrides };
}

export function compositionStanceDataAttributesFromProfile(
  profile: CompositionProfile,
): Record<string, string> {
  return {
    'data-composition-stance': profile.stance,
    'data-focal-column-ratio': String(profile.focalColumnRatio),
    'data-negative-space-scale': String(profile.negativeSpaceScale),
    'data-contextual-recess': String(profile.contextualRecess),
    'data-widget-weight-curve': profile.widgetWeightCurve,
  };
}

export function compositionLayoutStyle(
  composition: WorkspaceCompositionId | undefined,
  sceneOverrides?: Partial<CompositionProfile>,
): Record<string, string> {
  const profile = getCompositionProfile(composition);
  if (!profile) return {};
  const merged = mergeCompositionWithScene(profile, sceneOverrides);
  return {
    '--data-focal-column-ratio': String(merged.focalColumnRatio),
    '--data-negative-space-scale': String(merged.negativeSpaceScale),
    '--data-contextual-recess': String(merged.contextualRecess),
  };
}

export function compositionStanceDataAttributes(
  composition: WorkspaceCompositionId | undefined,
  sceneOverrides?: Partial<CompositionProfile>,
): Record<string, string> {
  const profile = getCompositionProfile(composition);
  if (!profile) return {};
  return compositionStanceDataAttributesFromProfile(
    mergeCompositionWithScene(profile, sceneOverrides),
  );
}
