/**
 * Layer 5 — authoring context (UI/session, not canonical content).
 * @see docs/plans/authoring-workflow.md
 */

export const AUTHORING_CONTEXT_KINDS = [
  'freeform',
  'narrative_workspace',
  'arc',
  'questline',
  'scene',
  'session_prep',
  'chronicle',
] as const;

export type AuthoringContextKind = (typeof AUTHORING_CONTEXT_KINDS)[number];

export const AUTHORING_OVERLAY_IDS = [
  'mystery-structure',
  'three-act-pacing',
  'open-threads',
  'arc-progress',
] as const;

export type AuthoringOverlayId = (typeof AUTHORING_OVERLAY_IDS)[number];

export interface AuthoringContext {
  kind: AuthoringContextKind;
  /** Wiki page ids anchoring this session (arc, quest, scene, etc.). */
  anchorEntityIds?: string[];
  /** Active structured overlays — only in workshop / deliberate contexts. */
  overlayIds?: AuthoringOverlayId[];
}

export const FREEFORM_AUTHORING_CONTEXT: AuthoringContext = {
  kind: 'freeform',
};

export function parseAuthoringContextFromSearch(search: string): AuthoringContext {
  const params = new URLSearchParams(search);
  const kind = params.get('authoringKind');
  const anchors = params.get('anchors');
  const overlays = params.get('overlays');

  const parsedKind =
    kind && (AUTHORING_CONTEXT_KINDS as readonly string[]).includes(kind)
      ? (kind as AuthoringContextKind)
      : 'narrative_workspace';

  const anchorEntityIds = anchors
    ? anchors
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : undefined;

  const overlayIds = overlays
    ? overlays
        .split(',')
        .map((id) => id.trim())
        .filter((id): id is AuthoringOverlayId =>
          (AUTHORING_OVERLAY_IDS as readonly string[]).includes(id),
        )
    : undefined;

  return {
    kind: parsedKind,
    anchorEntityIds: anchorEntityIds?.length ? anchorEntityIds : undefined,
    overlayIds: overlayIds?.length ? overlayIds : undefined,
  };
}

export function buildAuthoringWorkshopHref(
  basePath: string,
  context: Omit<AuthoringContext, 'kind'> & { kind?: AuthoringContextKind },
): string {
  const kind = context.kind ?? 'narrative_workspace';
  const params = new URLSearchParams();

  if (kind === 'scene') {
    params.set('section', 'scenes');
    if (context.anchorEntityIds?.length) {
      params.set('anchors', context.anchorEntityIds.join(','));
    }
  } else {
    params.set('section', 'workshop');
    if (kind !== 'freeform') {
      params.set('authoringKind', kind);
    }
    if (context.anchorEntityIds?.length) {
      params.set('anchors', context.anchorEntityIds.join(','));
    }
    if (context.overlayIds?.length) {
      params.set('overlays', context.overlayIds.join(','));
    }
  }

  return `${basePath}?${params.toString()}`;
}

export function readWorkshopDraftIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const draft = params.get('draft')?.trim();
  return draft || null;
}

export function inferAuthoringKindFromMetadata(metadata: unknown): AuthoringContextKind | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = metadata as Record<string, unknown>;
  if (raw.arcKind !== undefined || raw.arcMetadataVersion !== undefined) return 'arc';
  if (raw.sceneStatus !== undefined || raw.beatType !== undefined) return 'scene';
  if (raw.questStatus !== undefined || raw.questType !== undefined) return 'questline';
  if (raw.threadKind !== undefined) return 'chronicle';
  return null;
}
