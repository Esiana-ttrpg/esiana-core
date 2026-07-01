import {
  WORKSPACE_COMPOSITION_CLASS,
  WORKSPACE_DOCUMENT_CLASS,
  WORKSPACE_FIELD_CLASS,
} from './surfaceLayout.ts';

export type WorkspaceCompositionId =
  | 'dashboard'
  | 'codex'
  | 'entity'
  | 'hub'
  | 'studio'
  | 'reference'
  | 'document';

export type NarrativeDefault = 'inline' | 'stacked';

export interface WorkspaceCompositionPreset {
  id: WorkspaceCompositionId;
  shellClass: string;
  narrativeDefault: NarrativeDefault;
  focalMeasure: 'full' | 'readable';
  asymmetricGrid: boolean;
}

const WORKSPACE_SHELL_PADDING =
  'max-w-none w-full px-4 sm:px-6 lg:px-10 transition-all duration-200';

const PRESETS: Record<WorkspaceCompositionId, WorkspaceCompositionPreset> = {
  dashboard: {
    id: 'dashboard',
    shellClass: `${WORKSPACE_COMPOSITION_CLASS} ${WORKSPACE_FIELD_CLASS} ${WORKSPACE_SHELL_PADDING}`,
    narrativeDefault: 'inline',
    focalMeasure: 'full',
    asymmetricGrid: true,
  },
  codex: {
    id: 'codex',
    shellClass: `${WORKSPACE_COMPOSITION_CLASS} ${WORKSPACE_FIELD_CLASS} ${WORKSPACE_SHELL_PADDING}`,
    narrativeDefault: 'inline',
    focalMeasure: 'full',
    asymmetricGrid: true,
  },
  entity: {
    id: 'entity',
    shellClass: `${WORKSPACE_COMPOSITION_CLASS} ${WORKSPACE_FIELD_CLASS} ${WORKSPACE_SHELL_PADDING}`,
    narrativeDefault: 'inline',
    focalMeasure: 'full',
    asymmetricGrid: true,
  },
  hub: {
    id: 'hub',
    shellClass: `${WORKSPACE_COMPOSITION_CLASS} ${WORKSPACE_FIELD_CLASS} ${WORKSPACE_SHELL_PADDING}`,
    narrativeDefault: 'stacked',
    focalMeasure: 'full',
    asymmetricGrid: false,
  },
  studio: {
    id: 'studio',
    shellClass: `${WORKSPACE_COMPOSITION_CLASS} ${WORKSPACE_FIELD_CLASS} ${WORKSPACE_SHELL_PADDING}`,
    narrativeDefault: 'stacked',
    focalMeasure: 'full',
    asymmetricGrid: false,
  },
  reference: {
    id: 'reference',
    shellClass: `${WORKSPACE_COMPOSITION_CLASS} ${WORKSPACE_FIELD_CLASS} ${WORKSPACE_SHELL_PADDING}`,
    narrativeDefault: 'stacked',
    focalMeasure: 'readable',
    asymmetricGrid: false,
  },
  document: {
    id: 'document',
    shellClass: WORKSPACE_DOCUMENT_CLASS,
    narrativeDefault: 'stacked',
    focalMeasure: 'readable',
    asymmetricGrid: false,
  },
};

export function getWorkspaceCompositionPreset(
  id: WorkspaceCompositionId,
): WorkspaceCompositionPreset {
  return PRESETS[id];
}

/** Map campaign route pathname to a workspace composition preset. */
export function resolveWorkspaceComposition(pathname: string): WorkspaceCompositionPreset {
  const segments = pathname.split('/').filter(Boolean);
  // Expected: campaigns / :campaignHandle / ...
  if (segments[0] !== 'campaigns' || segments.length < 2) {
    return PRESETS.document;
  }

  const rest = segments.slice(2);
  if (rest.length === 0) {
    return PRESETS.codex;
  }

  const [first, second] = rest;

  if (first === 'dashboard') return PRESETS.dashboard;

  if (first === 'settings' || first === 'transfer-ownership') {
    return PRESETS.document;
  }

  if (first === 'world-advance') return PRESETS.document;

  if (first === 'wiki' && second === 'maintenance') return PRESETS.document;

  if (first === 'pages' && second) return PRESETS.codex;

  if (
    [
      'characters',
      'bestiary',
      'ancestries',
      'organizations',
      'locations',
      'objects',
      'families',
      'rules-resources',
      'adventures',
      'threads',
      'havens',
      'projects',
      'journals',
    ].includes(first) &&
    second
  ) {
    return PRESETS.entity;
  }

  if (first === 'notes' || first === 'notes-index') return PRESETS.reference;

  if (first === 'adventures' && !second) return PRESETS.hub;

  if (
    first === 'chronology' ||
    first === 'party' ||
    first === 'visual-atlas' ||
    first === 'relations' ||
    first === 'time-tracking' ||
    first === 'maps' ||
    first === 'progression'
  ) {
    return PRESETS.studio;
  }

  if (first === 'session-notes' || first === 'recent-changes') {
    return PRESETS.studio;
  }

  // Single-segment wiki pages: /campaigns/:handle/:pageId
  if (rest.length === 1 && first !== 'wiki') {
    return PRESETS.codex;
  }

  return PRESETS.studio;
}

export function isWorkspaceComposition(preset: WorkspaceCompositionPreset): boolean {
  return preset.id !== 'document';
}

/** Studio/hub surfaces may show a contextual workspace rail; document/reference do not. */
export function supportsWorkspaceRail(id: WorkspaceCompositionId): boolean {
  return id === 'studio' || id === 'hub' || id === 'dashboard' || id === 'codex';
}

export function shellClassesForComposition(
  preset: WorkspaceCompositionPreset,
  documentWidthClasses: string,
): string {
  if (preset.id === 'document') {
    return `${documentWidthClasses} ${WORKSPACE_DOCUMENT_CLASS} ultrawide-focal-column`;
  }
  return preset.shellClass;
}
