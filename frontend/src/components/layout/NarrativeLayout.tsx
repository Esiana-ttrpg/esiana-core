import type { ReactNode, CSSProperties } from 'react';
import { useSceneComposition } from '@/contexts/SceneCompositionContext';
import { WORKSPACE_COMPOSITION_CLASS } from '@/lib/surfaceLayout';
import type { WorkspaceCompositionId } from '@/lib/workspaceComposition';
import { getWorkspaceCompositionPreset } from '@/lib/workspaceComposition';
import {
  compositionLayoutStyle,
  compositionStanceDataAttributes,
} from '@/lib/compositionDoctrine';

export type NarrativeLayoutMode = 'stacked' | 'inline';

interface NarrativeLayoutProps {
  /** Primary narrative stream — one per view */
  focal: ReactNode;
  /** Contextual continuity rail */
  contextual?: ReactNode;
  /** When true, focal and contextual sit side-by-side on large screens */
  inlineContextual?: boolean;
  /** Route-driven composition preset — selects grid variant and defaults */
  composition?: WorkspaceCompositionId;
  className?: string;
  /** Overrides / CSS vars on the grid root (e.g. resizable rail width) */
  style?: CSSProperties;
}

function compositionGridClass(composition?: WorkspaceCompositionId): string {
  if (!composition) return '';
  if (composition === 'hub') return 'narrative-layout--hub';
  if (
    composition === 'dashboard' ||
    composition === 'codex' ||
    composition === 'entity' ||
    composition === 'studio' ||
    composition === 'reference'
  ) {
    return 'narrative-layout--workspace';
  }
  return '';
}

export function NarrativeLayout({
  focal,
  contextual,
  inlineContextual,
  composition,
  className = '',
  style,
}: NarrativeLayoutProps) {
  const preset = composition ? getWorkspaceCompositionPreset(composition) : null;
  const useInline =
    inlineContextual ??
    (preset?.narrativeDefault === 'inline' && Boolean(contextual));
  const layoutMode: NarrativeLayoutMode =
    useInline && contextual ? 'inline' : 'stacked';
  const { scene } = useSceneComposition();
  const sceneOverrides = scene?.layoutOverrides;
  const gridClass = compositionGridClass(composition);
  const stanceAttrs = compositionStanceDataAttributes(composition, sceneOverrides);
  const layoutStyle = {
    ...compositionLayoutStyle(composition, sceneOverrides),
    ...style,
  } as CSSProperties;
  const sceneClass = scene ? `narrative-layout--scene-${scene.id}` : '';

  return (
    <div
      className={[
        'narrative-layout',
        layoutMode === 'inline' ? 'narrative-layout--inline' : '',
        gridClass,
        sceneClass,
        composition && composition !== 'document'
          ? WORKSPACE_COMPOSITION_CLASS
          : layoutMode === 'inline'
            ? WORKSPACE_COMPOSITION_CLASS
            : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={layoutStyle}
      data-narrative-layout={layoutMode}
      data-workspace-composition={composition ?? undefined}
      {...stanceAttrs}
    >
      <div className="narrative-layout__focal min-w-0">{focal}</div>
      {contextual ? (
        <div
          className={[
            'narrative-layout__contextual',
            layoutMode === 'inline' ? '' : 'narrative-layout__contextual--overlay-host',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            {
              '--data-contextual-recess': stanceAttrs['data-contextual-recess'] ?? '0.82',
            } as CSSProperties
          }
        >
          {contextual}
        </div>
      ) : null}
    </div>
  );
}
