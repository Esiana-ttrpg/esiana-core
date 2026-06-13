import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useBranding } from '@/contexts/BrandingContext';
import {
  buildMergedThemeConfigFromProfile,
  resolveProfilePaletteWithFallback,
} from '@/lib/theme';
import { applySceneComposition } from '@/lib/theme/applySceneComposition';
import {
  resolveSceneComposition,
  type SceneCompositionProfile,
} from '@/lib/theme/sceneComposition';
import {
  resolveWorkspaceComposition,
  type WorkspaceCompositionId,
} from '@/lib/workspaceComposition';

export interface SceneCompositionState {
  scene: SceneCompositionProfile | null;
  workspaceCompositionId: WorkspaceCompositionId;
}

const SceneCompositionContext = createContext<SceneCompositionState | null>(null);

export function SceneCompositionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { resolvedProfile } = useBranding();

  const workspacePreset = useMemo(
    () => resolveWorkspaceComposition(location.pathname),
    [location.pathname],
  );

  const scene = useMemo(() => {
    const paletteId = resolveProfilePaletteWithFallback(resolvedProfile);
    return resolveSceneComposition({
      paletteId,
      workspaceCompositionId: workspacePreset.id,
      pathname: location.pathname,
    });
  }, [resolvedProfile, workspacePreset.id, location.pathname]);

  const lastAppliedKey = useRef('');

  useEffect(() => {
    const key = scene ? `${scene.id}:${location.pathname}` : `none:${location.pathname}`;
    if (key === lastAppliedKey.current) return;
    lastAppliedKey.current = key;

    const themeConfig = buildMergedThemeConfigFromProfile(resolvedProfile);
    applySceneComposition(scene, themeConfig);
  }, [scene, location.pathname, resolvedProfile]);

  const value = useMemo(
    () => ({
      scene,
      workspaceCompositionId: workspacePreset.id,
    }),
    [scene, workspacePreset.id],
  );

  return (
    <SceneCompositionContext.Provider value={value}>
      {children}
    </SceneCompositionContext.Provider>
  );
}

export function useSceneComposition(): SceneCompositionState {
  const ctx = useContext(SceneCompositionContext);
  if (!ctx) {
    return {
      scene: null,
      workspaceCompositionId: 'document',
    };
  }
  return ctx;
}
